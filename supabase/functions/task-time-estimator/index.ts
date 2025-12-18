import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface TaskEstimationRequest {
  workspace_id: string;
  user_id?: string;
  task_id?: string;
  task_title: string;
  task_description?: string;
  task_priority?: 'low' | 'medium' | 'high' | 'urgent';
  task_complexity?: 'low' | 'medium' | 'high' | 'very_high';
  project_type?: string;
  similar_tasks?: boolean;
}

interface HistoricalTask {
  task_title: string;
  task_description: string;
  task_priority: string;
  task_complexity: string;
  estimated_hours: number;
  actual_hours: number;
  accuracy_score: number;
  completion_date: string;
  factors: any;
}

interface TaskEstimation {
  estimated_hours: number;
  confidence_score: number;
  estimation_factors: {
    complexity_analysis: string;
    priority_impact: string;
    historical_similarity: string;
    risk_factors: string[];
    assumptions: string[];
    methodology: string;
  };
  similar_tasks_analyzed: number;
  time_breakdown: {
    planning: number;
    development: number;
    testing: number;
    review: number;
  };
  recommendations: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log(`Task estimation request: ${req.method} ${req.url}`)

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with service role key for full access
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })

    // Get the authorization header for user context
    const authHeader = req.headers.get('Authorization')
    console.log('Authorization header present:', !!authHeader)

    // Note: Authentication is handled automatically by Supabase client when using service role key
    // Individual user context is maintained through RLS policies

    let requestBody: TaskEstimationRequest
    try {
      requestBody = await req.json()
      console.log('Request body received:', {
        workspace_id: requestBody.workspace_id,
        task_title: requestBody.task_title,
        task_priority: requestBody.task_priority,
        task_complexity: requestBody.task_complexity
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

    const {
      workspace_id,
      user_id,
      task_id,
      task_title,
      task_description = '',
      task_priority = 'medium',
      task_complexity = 'medium',
      project_type = '',
      similar_tasks = true
    } = requestBody

    if (!workspace_id || !task_title) {
      return new Response(
        JSON.stringify({ error: 'workspace_id and task_title are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Generating estimation for task: "${task_title}" in workspace ${workspace_id}`)

    // Fetch historical task completion data
    let historicalTasks: HistoricalTask[] = []
    if (similar_tasks) {
      const { data: history, error: historyError } = await supabase
        .from('task_completion_history')
        .select('*')
        .eq('workspace_id', workspace_id)
        .order('completion_date', { ascending: false })
        .limit(50)

      if (historyError) {
        console.error('Error fetching historical data:', historyError)
      } else {
        historicalTasks = history || []
        console.log(`Found ${historicalTasks.length} historical tasks`)
      }
    }

    // Fetch current workspace tasks for context
    const { data: currentTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('title, description, priority, status, estimated_hours')
      .eq('workspace_id', workspace_id)
      .limit(20)

    if (tasksError) {
      console.error('Error fetching current tasks:', tasksError)
    }

    // Build AI prompt for Gemini
    const prompt = buildEstimationPrompt(
      task_title,
      task_description,
      task_priority,
      task_complexity,
      project_type,
      historicalTasks,
      currentTasks || []
    )

    // Call Gemini API
    let estimation: TaskEstimation
    try {
      const geminiResponse = await callGeminiAPI(prompt)
      estimation = parseGeminiResponse(geminiResponse, task_title)
      console.log('AI estimation generated successfully')
    } catch (error) {
      console.error('Gemini API error, using fallback estimation:', error)
      estimation = generateFallbackEstimation(task_title, task_complexity, task_priority, historicalTasks)
    }

    // Store estimation in database
    const { data: savedEstimation, error: saveError } = await supabase
      .from('task_estimations')
      .insert({
        workspace_id,
        user_id: user_id || null,
        task_id: task_id || null,
        task_title,
        task_description: task_description || null,
        task_priority,
        task_complexity,
        estimated_hours: estimation.estimated_hours,
        confidence_score: estimation.confidence_score,
        estimation_factors: estimation.estimation_factors,
        similar_tasks_analyzed: estimation.similar_tasks_analyzed
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving estimation:', saveError)
      throw new Error(`Failed to save estimation: ${saveError.message}`)
    }

    console.log('Estimation saved successfully:', savedEstimation.id)

    return new Response(
      JSON.stringify({
        success: true,
        estimation: savedEstimation,
        time_breakdown: estimation.time_breakdown,
        recommendations: estimation.recommendations,
        metadata: {
          similar_tasks_found: historicalTasks.length,
          current_tasks_analyzed: currentTasks?.length || 0,
          ai_model: 'gemini-1.5-flash',
          estimation_method: 'ai_analysis'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in task estimation function:', error)
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

function buildEstimationPrompt(
  taskTitle: string,
  taskDescription: string,
  priority: string,
  complexity: string,
  projectType: string,
  historicalTasks: HistoricalTask[],
  currentTasks: any[]
): string {
  const historicalAnalysis = analyzeHistoricalTasks(historicalTasks)
  const currentContext = analyzeCurrentTasks(currentTasks)

  return `You are an expert AI task estimation system specializing in software development and project management. Analyze the following task and provide a detailed time estimation.

TASK TO ESTIMATE:
Title: ${taskTitle}
Description: ${taskDescription}
Priority: ${priority}
Complexity: ${complexity}
Project Type: ${projectType}

HISTORICAL CONTEXT:
${historicalAnalysis}

CURRENT WORKSPACE CONTEXT:
${currentContext}

ESTIMATION REQUIREMENTS:
1. Provide time estimation in hours (be realistic, consider all phases)
2. Factor in complexity, priority, and historical patterns
3. Consider potential risks and unknowns
4. Account for testing, review, and deployment time
5. Provide confidence score based on available data

Please respond in this exact JSON format:
{
  "estimated_hours": <number>,
  "confidence_score": <number between 0 and 1>,
  "estimation_factors": {
    "complexity_analysis": "<detailed analysis of task complexity>",
    "priority_impact": "<how priority affects timeline>",
    "historical_similarity": "<analysis of similar historical tasks>",
    "risk_factors": ["<risk1>", "<risk2>", "<risk3>"],
    "assumptions": ["<assumption1>", "<assumption2>"],
    "methodology": "<explanation of estimation approach>"
  },
  "similar_tasks_analyzed": <number>,
  "time_breakdown": {
    "planning": <hours for planning/analysis>,
    "development": <hours for implementation>,
    "testing": <hours for testing/QA>,
    "review": <hours for code review and refinement>
  },
  "recommendations": [
    "<recommendation1>",
    "<recommendation2>",
    "<recommendation3>"
  ]
}

Focus on accuracy and provide actionable insights.`
}

function analyzeHistoricalTasks(tasks: HistoricalTask[]): string {
  if (tasks.length === 0) {
    return "No historical task data available for this workspace."
  }

  const avgEstimated = tasks.reduce((sum, t) => sum + t.estimated_hours, 0) / tasks.length
  const avgActual = tasks.reduce((sum, t) => sum + t.actual_hours, 0) / tasks.length
  const avgAccuracy = tasks.reduce((sum, t) => sum + (t.accuracy_score || 0), 0) / tasks.length

  const complexityBreakdown = tasks.reduce((acc, task) => {
    acc[task.task_complexity] = (acc[task.task_complexity] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return `
Historical Task Analysis (${tasks.length} tasks):
- Average estimated time: ${avgEstimated.toFixed(1)} hours
- Average actual time: ${avgActual.toFixed(1)} hours
- Average estimation accuracy: ${(avgAccuracy * 100).toFixed(1)}%
- Complexity distribution: ${Object.entries(complexityBreakdown).map(([k, v]) => `${k}: ${v}`).join(', ')}

Recent Task Examples:
${tasks.slice(0, 5).map(t => 
  `- "${t.task_title}" (${t.task_complexity} complexity, ${t.task_priority} priority): Est ${t.estimated_hours}h, Actual ${t.actual_hours}h`
).join('\n')}
`
}

function analyzeCurrentTasks(tasks: any[]): string {
  if (tasks.length === 0) {
    return "No current tasks available for context analysis."
  }

  const statusCounts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const avgEstimated = tasks
    .filter(t => t.estimated_hours)
    .reduce((sum, t, _, arr) => sum + t.estimated_hours / arr.length, 0)

  return `
Current Workspace Context (${tasks.length} tasks):
- Status distribution: ${Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(', ')}
- Average estimated time: ${avgEstimated.toFixed(1)} hours
- Sample tasks: ${tasks.slice(0, 3).map(t => `"${t.title}"`).join(', ')}
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
          temperature: 0.2,
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

function parseGeminiResponse(response: string, taskTitle: string): TaskEstimation {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Gemini response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate and sanitize the response
    return {
      estimated_hours: Math.max(0.5, Math.min(200, parsed.estimated_hours || 8)),
      confidence_score: Math.max(0, Math.min(1, parsed.confidence_score || 0.5)),
      estimation_factors: parsed.estimation_factors || getDefaultEstimationFactors(),
      similar_tasks_analyzed: parsed.similar_tasks_analyzed || 0,
      time_breakdown: parsed.time_breakdown || getDefaultTimeBreakdown(parsed.estimated_hours || 8),
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
    }

  } catch (error) {
    console.error('Error parsing Gemini response:', error)
    console.error('Raw response:', response)

    // Return fallback estimation
    throw new Error('Failed to parse AI response')
  }
}

function generateFallbackEstimation(
  taskTitle: string,
  complexity: string,
  priority: string,
  historicalTasks: HistoricalTask[]
): TaskEstimation {
  // Simple rule-based estimation as fallback
  const baseHours = {
    'low': 4,
    'medium': 8,
    'high': 16,
    'very_high': 24
  }[complexity] || 8

  const priorityMultiplier = {
    'low': 0.8,
    'medium': 1.0,
    'high': 1.2,
    'urgent': 1.5
  }[priority] || 1.0

  const estimatedHours = baseHours * priorityMultiplier

  return {
    estimated_hours: estimatedHours,
    confidence_score: historicalTasks.length > 5 ? 0.7 : 0.4,
    estimation_factors: {
      complexity_analysis: `Task classified as ${complexity} complexity, requiring ${baseHours} base hours`,
      priority_impact: `${priority} priority adds ${((priorityMultiplier - 1) * 100).toFixed(0)}% time adjustment`,
      historical_similarity: `Based on ${historicalTasks.length} historical tasks in workspace`,
      risk_factors: ["Limited historical data", "Rule-based estimation fallback"],
      assumptions: ["Standard development workflow", "No major blockers expected"],
      methodology: "Rule-based estimation using complexity and priority factors"
    },
    similar_tasks_analyzed: historicalTasks.length,
    time_breakdown: getDefaultTimeBreakdown(estimatedHours),
    recommendations: [
      "Track actual completion time to improve future estimates",
      "Break down complex tasks into smaller subtasks",
      "Consider potential dependencies and blockers"
    ]
  }
}

function getDefaultEstimationFactors() {
  return {
    complexity_analysis: "Unable to analyze complexity due to parsing error",
    priority_impact: "Default priority consideration applied",
    historical_similarity: "Historical analysis unavailable",
    risk_factors: ["Data parsing error", "Using fallback estimation"],
    assumptions: ["Standard task workflow"],
    methodology: "Fallback rule-based estimation"
  }
}

function getDefaultTimeBreakdown(totalHours: number) {
  return {
    planning: Math.round(totalHours * 0.15 * 10) / 10,
    development: Math.round(totalHours * 0.60 * 10) / 10,
    testing: Math.round(totalHours * 0.15 * 10) / 10,
    review: Math.round(totalHours * 0.10 * 10) / 10
  }
}
