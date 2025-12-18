import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WorkloadForecastRequest {
  workspace_id: string;
  user_id?: string;
  days_ahead?: number;
  forecast_type?: 'daily' | 'weekly' | 'monthly';
}

interface WorkloadMetric {
  id: string;
  workspace_id: string;
  user_id: string | null;
  task_count: number;
  completed_tasks: number;
  hours_worked: number;
  productivity_score: number;
  date: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  estimated_hours: number | null;
  complexity: string | null;
}

interface GeminiResponse {
  predicted_workload: number;
  confidence_score: number;
  recommendations: {
    resource_allocation: string;
    priority_adjustments: string;
    risk_factors: string[];
    optimization_tips: string[];
    bottleneck_analysis: string;
    capacity_planning: string;
  };
  daily_breakdown?: Array<{
    date: string;
    predicted_hours: number;
    key_tasks: string[];
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('Authorization header present:', !!authHeader)

    if (authHeader) {
      supabase.auth.setAuth(authHeader.replace('Bearer ', ''))
    }

    let requestBody: WorkloadForecastRequest
    try {
      requestBody = await req.json()
      console.log('Request body received:', {
        workspace_id: requestBody.workspace_id,
        user_id: requestBody.user_id,
        days_ahead: requestBody.days_ahead,
        forecast_type: requestBody.forecast_type
      })
    } catch (error) {
      console.error('Error parsing request body:', error)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { workspace_id, user_id, days_ahead = 7, forecast_type = 'daily' } = requestBody

    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: 'workspace_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Generating ${forecast_type} forecast for workspace ${workspace_id}, ${days_ahead} days ahead`)

    // Fetch historical workload metrics (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: metrics, error: metricsError } = await supabase
      .from('workload_metrics')
      .select('*')
      .eq('workspace_id', workspace_id)
      .gte('date', thirtyDaysAgo)
      .order('date', { ascending: true })

    if (metricsError) {
      console.error('Error fetching metrics:', metricsError)
      throw new Error(`Failed to fetch workload metrics: ${metricsError.message}`)
    }

    // Fetch current and upcoming tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, estimated_hours, complexity')
      .eq('workspace_id', workspace_id)
      .in('status', ['pending', 'in_progress', 'todo'])
      .order('due_date', { ascending: true, nullsLast: true })

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      throw new Error(`Failed to fetch tasks: ${tasksError.message}`)
    }

    // Fetch team members for workload distribution analysis
    const { data: teamMembers, error: membersError } = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspace_id)

    if (membersError) {
      console.error('Error fetching team members:', membersError)
      // Continue without team member data
    }

    // Prepare data for Gemini API
    const prompt = buildAdvancedForecastPrompt(
      metrics as WorkloadMetric[],
      tasks as Task[],
      days_ahead,
      forecast_type,
      teamMembers?.length || 1
    )

    // Call Gemini API
    const geminiResponse = await callGeminiAPI(prompt)
    console.log('Gemini API response received')

    // Parse and validate forecast
    const forecast = parseGeminiResponse(geminiResponse, days_ahead)

    // Store forecast in database
    const forecastDate = new Date(Date.now() + days_ahead * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]

    const { data: savedForecast, error: saveError } = await supabase
      .from('workload_forecasts')
      .insert({
        workspace_id,
        user_id: user_id || null,
        forecast_date: forecastDate,
        predicted_workload: forecast.predicted_workload,
        confidence_score: forecast.confidence_score,
        recommendations: forecast.recommendations,
        forecast_type
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving forecast:', saveError)
      throw new Error(`Failed to save forecast: ${saveError.message}`)
    }

    console.log('Forecast saved successfully:', savedForecast.id)

    return new Response(
      JSON.stringify({
        success: true,
        forecast: savedForecast,
        daily_breakdown: forecast.daily_breakdown || null,
        metadata: {
          metrics_analyzed: metrics?.length || 0,
          tasks_analyzed: tasks?.length || 0,
          team_size: teamMembers?.length || 1,
          forecast_horizon: `${days_ahead} days`
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in workload forecast function:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function buildAdvancedForecastPrompt(
  metrics: WorkloadMetric[],
  tasks: Task[],
  daysAhead: number,
  forecastType: string,
  teamSize: number
): string {
  const metricsAnalysis = analyzeMetrics(metrics)
  const tasksAnalysis = analyzeTasks(tasks)

  return `You are an advanced AI workload forecasting system with expertise in project management, resource planning, and productivity analysis.

CONTEXT:
- Team Size: ${teamSize} members
- Forecast Period: ${daysAhead} days ahead
- Forecast Type: ${forecastType}
- Current Date: ${new Date().toISOString().split('T')[0]}

HISTORICAL PERFORMANCE DATA (Last 30 days):
${metricsAnalysis}

CURRENT TASK PIPELINE:
${tasksAnalysis}

ANALYSIS REQUIREMENTS:
1. Analyze productivity trends and patterns
2. Consider task complexity and priority distribution
3. Account for potential bottlenecks and dependencies
4. Factor in team capacity and workload distribution
5. Identify seasonal or cyclical patterns
6. Assess risk factors that could impact delivery

Please provide your response in this exact JSON format:
{
  "predicted_workload": <number: average hours per day>,
  "confidence_score": <number: 0-1 confidence level>,
  "recommendations": {
    "resource_allocation": "<detailed recommendation>",
    "priority_adjustments": "<specific priority changes>",
    "risk_factors": ["<factor1>", "<factor2>", "<factor3>"],
    "optimization_tips": ["<tip1>", "<tip2>", "<tip3>"],
    "bottleneck_analysis": "<potential bottlenecks and solutions>",
    "capacity_planning": "<team capacity recommendations>"
  },
  "daily_breakdown": [
    {
      "date": "<YYYY-MM-DD>",
      "predicted_hours": <number>,
      "key_tasks": ["<task1>", "<task2>"]
    }
  ]
}

Focus on actionable insights and specific recommendations based on the data patterns you observe.`
}

function analyzeMetrics(metrics: WorkloadMetric[]): string {
  if (!metrics || metrics.length === 0) {
    return "No historical metrics available - this is a new workspace."
  }

  const avgTaskCount = metrics.reduce((sum, m) => sum + m.task_count, 0) / metrics.length
  const avgCompletedTasks = metrics.reduce((sum, m) => sum + m.completed_tasks, 0) / metrics.length
  const avgHoursWorked = metrics.reduce((sum, m) => sum + m.hours_worked, 0) / metrics.length
  const avgProductivity = metrics.reduce((sum, m) => sum + m.productivity_score, 0) / metrics.length

  const recentMetrics = metrics.slice(-7) // Last 7 days
  const recentAvgProductivity = recentMetrics.length > 0
    ? recentMetrics.reduce((sum, m) => sum + m.productivity_score, 0) / recentMetrics.length
    : avgProductivity

  return `
Historical Metrics Summary:
- Average daily task count: ${avgTaskCount.toFixed(1)}
- Average completed tasks: ${avgCompletedTasks.toFixed(1)}
- Average hours worked: ${avgHoursWorked.toFixed(1)}
- Average productivity score: ${avgProductivity.toFixed(2)}
- Recent productivity trend: ${recentAvgProductivity.toFixed(2)} (last 7 days)
- Total data points: ${metrics.length} days
- Completion rate: ${((avgCompletedTasks / avgTaskCount) * 100).toFixed(1)}%

Daily Metrics Detail:
${metrics.map(m => 
  `${m.date}: ${m.task_count} tasks, ${m.completed_tasks} completed, ${m.hours_worked}h, productivity: ${m.productivity_score}`
).join('\n')}
`
}

function analyzeTasks(tasks: Task[]): string {
  if (!tasks || tasks.length === 0) {
    return "No pending tasks found."
  }

  const priorityCounts = tasks.reduce((acc, task) => {
    acc[task.priority] = (acc[task.priority] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const statusCounts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const tasksWithDueDates = tasks.filter(t => t.due_date).length
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length

  return `
Task Pipeline Analysis:
- Total pending tasks: ${tasks.length}
- Priority distribution: ${Object.entries(priorityCounts).map(([p, c]) => `${p}: ${c}`).join(', ')}
- Status distribution: ${Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(', ')}
- Tasks with due dates: ${tasksWithDueDates}
- Overdue tasks: ${overdueTasks}
- Estimated hours (where available): ${tasks.filter(t => t.estimated_hours).reduce((sum, t) => sum + (t.estimated_hours || 0), 0)}

Task Details:
${tasks.slice(0, 10).map(t => 
  `- "${t.title}" (${t.priority} priority, ${t.status}, due: ${t.due_date || 'no date'}, est: ${t.estimated_hours || 'unknown'}h)`
).join('\n')}
${tasks.length > 10 ? `... and ${tasks.length - 10} more tasks` : ''}
`
}

async function callGeminiAPI(prompt: string): Promise<string> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not configured')
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
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
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Gemini API error response:', errorText)
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    console.error('Unexpected Gemini API response structure:', data)
    throw new Error('Invalid response structure from Gemini API')
  }

  return data.candidates[0].content.parts[0].text
}

function parseGeminiResponse(response: string, daysAhead: number): GeminiResponse {
  try {
    // Clean the response to extract JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Gemini response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate required fields
    if (typeof parsed.predicted_workload !== 'number') {
      throw new Error('Invalid predicted_workload in response')
    }
    if (typeof parsed.confidence_score !== 'number') {
      throw new Error('Invalid confidence_score in response')
    }

    // Ensure confidence score is between 0 and 1
    parsed.confidence_score = Math.max(0, Math.min(1, parsed.confidence_score))

    // Validate recommendations object
    if (!parsed.recommendations || typeof parsed.recommendations !== 'object') {
      parsed.recommendations = getDefaultRecommendations()
    }

    // Ensure daily_breakdown exists and has correct structure
    if (!parsed.daily_breakdown || !Array.isArray(parsed.daily_breakdown)) {
      parsed.daily_breakdown = generateDefaultDailyBreakdown(parsed.predicted_workload, daysAhead)
    }

    return parsed as GeminiResponse

  } catch (error) {
    console.error('Error parsing Gemini response:', error)
    console.error('Raw response:', response)

    // Return fallback response
    return {
      predicted_workload: 8.0,
      confidence_score: 0.5,
      recommendations: getDefaultRecommendations(),
      daily_breakdown: generateDefaultDailyBreakdown(8.0, daysAhead)
    }
  }
}

function getDefaultRecommendations() {
  return {
    resource_allocation: "Unable to generate specific recommendations due to data parsing error. Please review task distribution manually.",
    priority_adjustments: "Review high-priority tasks and ensure adequate resources are allocated.",
    risk_factors: ["Data parsing error", "Limited historical data"],
    optimization_tips: ["Improve data collection consistency", "Regular workload monitoring"],
    bottleneck_analysis: "Manual analysis required due to processing error.",
    capacity_planning: "Review team capacity and adjust task assignments accordingly."
  }
}

function generateDefaultDailyBreakdown(avgWorkload: number, days: number) {
  const breakdown = []
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    breakdown.push({
      date,
      predicted_hours: avgWorkload,
      key_tasks: ["Task analysis unavailable"]
    })
  }
  return breakdown
}
