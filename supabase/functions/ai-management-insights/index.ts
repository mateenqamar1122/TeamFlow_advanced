import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface ManagementInsightsRequest {
  workspace_id: string;
  insight_type: 'team_performance' | 'project_overview' | 'resource_allocation' | 'risk_assessment' | 'strategic_recommendations' | 'productivity_analysis';
  date_range?: {
    start_date: string;
    end_date: string;
  };
  filters?: {
    project_ids?: string[];
    team_member_ids?: string[];
    priority_levels?: string[];
  };
  context?: string;
}

interface InsightData {
  projects: any[];
  tasks: any[];
  time_entries: any[];
  team_members: any[];
  workspace_stats: any;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { workspace_id, insight_type, date_range, filters, context }: ManagementInsightsRequest = await req.json()

    if (!workspace_id || !insight_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields: workspace_id and insight_type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Generating management insights for workspace: ${workspace_id}, type: ${insight_type}`)

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY environment variable is not configured')
      return new Response(JSON.stringify({ error: 'AI service configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const insightData = await fetchInsightData(supabase, workspace_id, date_range, filters)
    const insights = await generateManagementInsights(GEMINI_API_KEY, insight_type, insightData, context)

    // Store insights in the database
    try {
      await supabase
        .from('ai_management_insights')
        .insert({
          workspace_id,
          insight_type,
          title: `${insight_type.replace('_', ' ').toUpperCase()} Analysis`,
          description: `AI-generated insights for ${insight_type}`,
          insights: insights,
          confidence_score: 0.85,
          priority: insights.priority || 'medium',
          generated_by: null,
          metadata: { date_range, filters }
        })
    } catch (storageError) {
      console.log('Note: Could not store insights:', storageError)
    }

    return new Response(JSON.stringify({
      success: true,
      workspace_id,
      insight_type,
      insights,
      generated_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in management insights function:', error)
    return new Response(JSON.stringify({
      error: 'Failed to generate management insights',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function fetchInsightData(
  supabase: any,
  workspaceId: string,
  dateRange?: { start_date: string; end_date: string },
  filters?: any
): Promise<InsightData> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const startDate = dateRange?.start_date || thirtyDaysAgo
  const endDate = dateRange?.end_date || new Date().toISOString()

  console.log('Fetching insight data for date range:', startDate, 'to', endDate)

  // Fetch projects
  let projectQuery = supabase
    .from('projects')
    .select('*')
    .eq('workspace_id', workspaceId)

  if (filters?.project_ids?.length) {
    projectQuery = projectQuery.in('id', filters.project_ids)
  }

  const { data: projects, error: projectsError } = await projectQuery
  if (projectsError) {
    console.log('Projects query error (proceeding without):', projectsError.message)
  }

  // Fetch tasks
  let taskQuery = supabase
    .from('tasks')
    .select('*')
    .eq('workspace_id', workspaceId)

  if (filters?.priority_levels?.length) {
    taskQuery = taskQuery.in('priority', filters.priority_levels)
  }

  const { data: tasks, error: tasksError } = await taskQuery
  if (tasksError) {
    console.log('Tasks query error (proceeding without):', tasksError.message)
  }

  // Fetch time entries with error handling
  let timeEntries = []
  try {
    const { data, error: timeError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('workspace_id', workspaceId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (timeError) {
      console.log('Time entries query error (proceeding without):', timeError.message)
    } else {
      timeEntries = data || []
    }
  } catch (error) {
    console.log('Time entries table may not exist, proceeding without:', error)
  }

  // Fetch team members
  let memberQuery = supabase
    .from('workspace_members')
    .select(`
      *,
      profiles!workspace_members_user_id_fkey (
        id,
        display_name,
        avatar_url
      )
    `)
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)

  if (filters?.team_member_ids?.length) {
    memberQuery = memberQuery.in('user_id', filters.team_member_ids)
  }

  const { data: teamMembers, error: membersError } = await memberQuery
  if (membersError) {
    console.log('Team members query error (proceeding without):', membersError.message)
  }

  // Calculate workspace stats
  const workspaceStats = {
    total_projects: projects?.length || 0,
    active_projects: projects?.filter(p => p.status !== 'Completed' && p.status !== 'completed').length || 0,
    total_tasks: tasks?.length || 0,
    completed_tasks: tasks?.filter(t => t.status === 'Completed' || t.status === 'Done' || t.status === 'completed').length || 0,
    overdue_tasks: tasks?.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'Completed').length || 0,
    total_hours: timeEntries.reduce((sum: number, entry: any) => sum + (entry.hours || 0), 0) || 0,
    team_size: teamMembers?.length || 0,
    avg_completion_rate: projects?.length ? (projects.filter(p => p.status === 'Completed' || p.status === 'completed').length / projects.length) * 100 : 0
  }

  return {
    projects: projects || [],
    tasks: tasks || [],
    time_entries: timeEntries || [],
    team_members: teamMembers || [],
    workspace_stats: workspaceStats
  }
}

async function generateManagementInsights(
  apiKey: string,
  insightType: string,
  data: InsightData,
  context?: string
): Promise<any> {
  const prompts = {
    team_performance: `
      Analyze the following team performance data and provide comprehensive insights:
      
      Team Statistics:
      - Team size: ${data.workspace_stats.team_size}
      - Total tasks: ${data.workspace_stats.total_tasks}
      - Completed tasks: ${data.workspace_stats.completed_tasks}
      - Overdue tasks: ${data.workspace_stats.overdue_tasks}
      - Total hours logged: ${data.workspace_stats.total_hours}
      
      Team Members: ${JSON.stringify(data.team_members?.map(m => ({ name: m.profiles?.display_name, role: m.role })) || [])}
      
      ${context ? `Additional Context: ${context}` : ''}
      
      Please provide insights in JSON format with:
      {
        "overall_score": number (1-100),
        "productivity_trends": [string],
        "team_strengths": [string],
        "areas_for_improvement": [string],
        "recommendations": [string],
        "workload_analysis": string,
        "priority": "low|medium|high|critical"
      }
    `,
    project_overview: `
      Analyze the following project data for comprehensive overview:
      
      Project Statistics:
      - Total projects: ${data.workspace_stats.total_projects}
      - Active projects: ${data.workspace_stats.active_projects}
      - Average completion rate: ${data.workspace_stats.avg_completion_rate}%
      
      Projects: ${JSON.stringify(data.projects?.map(p => ({ name: p.name, status: p.status, progress: p.progress })) || [])}
      
      ${context ? `Additional Context: ${context}` : ''}
      
      Provide analysis in JSON format:
      {
        "health_status": "excellent|good|fair|poor|critical",
        "project_highlights": [string],
        "risk_factors": [string],
        "resource_allocation": string,
        "timeline_analysis": string,
        "recommendations": [string],
        "priority": "low|medium|high|critical"
      }
    `,
    risk_assessment: `
      Perform comprehensive risk assessment based on:
      
      Key Metrics:
      - Overdue tasks: ${data.workspace_stats.overdue_tasks}
      - Project completion rate: ${data.workspace_stats.avg_completion_rate}%
      - Team utilization: ${data.workspace_stats.total_hours} hours
      
      Projects: ${JSON.stringify(data.projects || [])}
      Tasks: ${JSON.stringify(data.tasks?.slice(0, 10) || [])}
      
      ${context ? `Additional Context: ${context}` : ''}
      
      Provide risk analysis in JSON format:
      {
        "risk_level": "low|medium|high|critical",
        "identified_risks": [
          {
            "type": string,
            "description": string,
            "probability": number,
            "impact": string,
            "mitigation_strategy": string
          }
        ],
        "recommendations": [string],
        "priority_actions": [string],
        "priority": "low|medium|high|critical"
      }
    `,
    resource_allocation: `
      Analyze resource allocation and utilization:
      
      Resource Data:
      - Team size: ${data.workspace_stats.team_size}
      - Active projects: ${data.workspace_stats.active_projects}
      - Total hours: ${data.workspace_stats.total_hours}
      - Task distribution: ${data.workspace_stats.total_tasks} tasks
      
      ${context ? `Additional Context: ${context}` : ''}
      
      Provide resource analysis in JSON format:
      {
        "utilization_score": number,
        "capacity_analysis": string,
        "bottlenecks": [string],
        "optimization_opportunities": [string],
        "recommendations": [string],
        "priority": "low|medium|high|critical"
      }
    `,
    productivity_analysis: `
      Analyze productivity metrics and trends:
      
      Productivity Data:
      - Completion rate: ${((data.workspace_stats.completed_tasks / Math.max(data.workspace_stats.total_tasks, 1)) * 100).toFixed(1)}%
      - Hours per task: ${data.workspace_stats.total_hours > 0 ? (data.workspace_stats.total_hours / Math.max(data.workspace_stats.total_tasks, 1)).toFixed(2) : 0}
      - Team efficiency: Based on ${data.workspace_stats.team_size} members
      
      ${context ? `Additional Context: ${context}` : ''}
      
      Provide productivity analysis in JSON format:
      {
        "productivity_score": number,
        "efficiency_trends": [string],
        "performance_indicators": [string],
        "improvement_areas": [string],
        "recommendations": [string],
        "priority": "low|medium|high|critical"
      }
    `,
    strategic_recommendations: `
      Provide strategic recommendations based on:
      
      Workspace Overview:
      - Projects: ${data.workspace_stats.total_projects} (${data.workspace_stats.active_projects} active)
      - Team: ${data.workspace_stats.team_size} members
      - Tasks: ${data.workspace_stats.total_tasks} (${data.workspace_stats.completed_tasks} completed)
      - Completion rate: ${data.workspace_stats.avg_completion_rate}%
      
      ${context ? `Additional Context: ${context}` : ''}
      
      Provide strategic analysis in JSON format:
      {
        "strategic_score": number,
        "growth_opportunities": [string],
        "operational_improvements": [string],
        "strategic_risks": [string],
        "long_term_recommendations": [string],
        "priority": "low|medium|high|critical"
      }
    `
  }

  const prompt = prompts[insightType as keyof typeof prompts] || prompts.team_performance

  try {
    console.log('Calling Gemini API with prompt for:', insightType)

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error response:', errorText)

      // Fallback to structured mock response
      return createFallbackInsight(insightType, data)
    }

    const result = await response.json()
    console.log('Gemini API success response received')

    if (!result.candidates || result.candidates.length === 0) {
      console.log('No candidates in response, using fallback')
      return createFallbackInsight(insightType, data)
    }

    const generatedText = result.candidates[0].content.parts[0].text

    // Try to parse JSON from the response
    try {
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const jsonStr = jsonMatch[0]
        const parsed = JSON.parse(jsonStr)
        console.log('Successfully parsed AI response')
        return parsed
      }
    } catch (parseError) {
      console.log('Could not parse JSON from response, using fallback')
    }

    // If JSON parsing failed, return the raw text with structure
    return {
      analysis: generatedText,
      generated_at: new Date().toISOString(),
      insight_type: insightType,
      priority: 'medium',
      recommendations: ['Review the AI analysis above for detailed insights']
    }

  } catch (error) {
    console.error('Error calling Gemini API:', error)
    return createFallbackInsight(insightType, data)
  }
}

function createFallbackInsight(insightType: string, data: InsightData): any {
  const completionRate = data.workspace_stats.total_tasks > 0
    ? (data.workspace_stats.completed_tasks / data.workspace_stats.total_tasks) * 100
    : 0

  const baseInsight = {
    generated_at: new Date().toISOString(),
    insight_type: insightType,
    workspace_stats: data.workspace_stats,
    priority: completionRate > 80 ? 'low' : completionRate > 60 ? 'medium' : 'high'
  }

  switch (insightType) {
    case 'team_performance':
      return {
        ...baseInsight,
        overall_score: Math.round(completionRate),
        productivity_trends: [
          `Team completed ${data.workspace_stats.completed_tasks} out of ${data.workspace_stats.total_tasks} tasks`,
          `${data.workspace_stats.team_size} team members are currently active`
        ],
        team_strengths: ['Task completion tracking', 'Team collaboration'],
        areas_for_improvement: data.workspace_stats.overdue_tasks > 0 ? ['Reduce overdue tasks', 'Improve time management'] : ['Maintain current performance'],
        recommendations: [
          'Continue monitoring task completion rates',
          'Regular team check-ins for project alignment',
          'Consider workload distribution optimization'
        ],
        workload_analysis: `Current workload shows ${data.workspace_stats.overdue_tasks} overdue tasks out of ${data.workspace_stats.total_tasks} total tasks`
      }
    case 'risk_assessment':
      return {
        ...baseInsight,
        risk_level: data.workspace_stats.overdue_tasks > 5 ? 'high' : data.workspace_stats.overdue_tasks > 2 ? 'medium' : 'low',
        identified_risks: [
          {
            type: 'Schedule Risk',
            description: `${data.workspace_stats.overdue_tasks} tasks are currently overdue`,
            probability: data.workspace_stats.overdue_tasks > 0 ? 0.7 : 0.3,
            impact: 'Medium to High',
            mitigation_strategy: 'Prioritize overdue tasks and reassess deadlines'
          }
        ],
        recommendations: [
          'Review and prioritize overdue tasks',
          'Implement regular deadline check-ins',
          'Consider resource reallocation if needed'
        ],
        priority_actions: data.workspace_stats.overdue_tasks > 0
          ? ['Address overdue tasks immediately', 'Review project timelines']
          : ['Maintain current monitoring practices']
      }
    default:
      return {
        ...baseInsight,
        analysis: `Analysis for ${insightType} completed. Your workspace has ${data.workspace_stats.total_projects} projects with a ${completionRate.toFixed(1)}% task completion rate.`,
        recommendations: [
          'Regular performance monitoring',
          'Team collaboration enhancement',
          'Process optimization opportunities'
        ]
      }
  }
}
