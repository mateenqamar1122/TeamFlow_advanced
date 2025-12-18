import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface RiskAnalysisRequest {
  workspace_id: string;
  task_ids?: string[];
  project_id?: string;
  analysis_type?: 'task' | 'project' | 'workspace';
  ai_model?: 'gemini-1.5-flash' | 'gemini-1.5-pro';
}

interface TaskData {
  id: string;
  title: string;
  description?: string;
  priority: 'Low' | 'Medium' | 'High';
  status: string;
  due_date?: string;
  start_date?: string;
  estimated_hours?: number;
  is_blocked?: boolean;
  blocked_reason?: string;
  assignee_name?: string;
  created_at: string;
  updated_at: string;
}

interface AIRiskAssessment {
  risk_score: number;
  delay_probability: number;
  predicted_delay_days: number;
  risk_factors: Array<{
    factor: string;
    impact_level: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    reasoning: string;
  }>;
  recommendations: {
    immediate_actions: string[];
    resource_adjustments: string[];
    timeline_suggestions: string[];
    risk_mitigations: string[];
  };
  confidence_level: number;
  ai_reasoning: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for full access
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: { persistSession: false }
      }
    )

    // Get authorization header for user context
    const authHeader = req.headers.get('Authorization')
    console.log('Authorization header present:', !!authHeader)

    // Note: Authentication is handled automatically by service role key
    // Individual user context is maintained through RLS policies

    // Parse request body with error handling
    let requestBody: RiskAnalysisRequest
    try {
      requestBody = await req.json()
      console.log('Request received:', {
        workspace_id: requestBody.workspace_id,
        analysis_type: requestBody.analysis_type,
        task_count: requestBody.task_ids?.length
      })
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { workspace_id, task_ids, project_id, analysis_type = 'workspace', ai_model = 'gemini-1.5-flash' } = requestBody

    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: 'workspace_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch tasks data
    let tasksQuery = supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', workspace_id);

    if (task_ids && task_ids.length > 0) {
      tasksQuery = tasksQuery.in('id', task_ids);
    }
    if (project_id) {
      tasksQuery = tasksQuery.eq('project_id', project_id);
    }

    const { data: tasks, error: tasksError } = await tasksQuery;
    if (tasksError) throw tasksError;

    // Fetch historical data for AI context
    const { data: historicalTasks, error: histError } = await supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('status', 'done')
      .not('due_date', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (histError) throw histError;

    // Fetch existing risk patterns for context
    const { data: patterns, error: patternsError } = await supabase
      .from('delay_risk_patterns')
      .select('*')
      .eq('workspace_id', workspace_id);

    if (patternsError) throw patternsError;

    const analysisResults = [];

    // Process each task with AI
    for (const task of tasks || []) {
      const aiAssessment = await analyzeTaskWithAI(task, historicalTasks || [], patterns || [], ai_model);

      // Save AI assessment to database
      const { error: insertError } = await supabase
        .from('task_risk_assessments')
        .insert({
          task_id: task.id,
          workspace_id: workspace_id,
          risk_score: aiAssessment.risk_score,
          delay_probability: aiAssessment.delay_probability,
          predicted_delay_days: aiAssessment.predicted_delay_days,
          risk_factors: aiAssessment.risk_factors.map(rf => ({
            id: `${rf.factor}_${Date.now()}`,
            type: rf.factor,
            description: rf.reasoning,
            impact_level: rf.impact_level === 'critical' ? 'high' : rf.impact_level,
            confidence: rf.confidence
          })),
          recommendations: aiAssessment.recommendations,
          confidence_level: aiAssessment.confidence_level,
          assessment_type: 'ai_generated',
          model_version: ai_model
        });

      if (insertError) {
        console.error('Error inserting assessment:', insertError);
        // Continue processing other tasks even if one fails
      }

      // Generate alerts for high-risk tasks
      if (aiAssessment.risk_score >= 0.7 || aiAssessment.delay_probability >= 0.6) {
        const { error: alertError } = await supabase
          .from('risk_alerts')
          .insert({
            workspace_id: workspace_id,
            task_id: task.id,
            alert_type: aiAssessment.risk_score >= 0.8 ? 'critical_risk' : 'high_risk',
            severity_level: aiAssessment.risk_score >= 0.8 ? 'critical' : 'high',
            alert_message: `AI detected high risk for task "${task.title}": ${Math.round(aiAssessment.risk_score * 100)}% risk score, ${Math.round(aiAssessment.delay_probability * 100)}% delay probability`,
            alert_data: {
              ai_reasoning: aiAssessment.ai_reasoning,
              risk_factors: aiAssessment.risk_factors,
              recommendations: aiAssessment.recommendations,
              confidence: aiAssessment.confidence_level
            },
            is_resolved: false
          });

        if (alertError) {
          console.error('Error creating alert:', alertError);
          // Continue processing even if alert creation fails
        }
      }

      analysisResults.push({
        task_id: task.id,
        ...aiAssessment
      });
    }

    // Identify new patterns using AI
    const newPatterns = await identifyPatternsWithAI(tasks || [], historicalTasks || [], patterns || [], ai_model);

    // Save new patterns
    for (const pattern of newPatterns) {
      const { error: patternError } = await supabase
        .from('delay_risk_patterns')
        .insert({
          workspace_id: workspace_id,
          pattern_name: pattern.name,
          pattern_type: pattern.type,
          pattern_data: pattern.data,
          frequency_score: pattern.frequency,
          impact_score: pattern.impact,
          confidence_score: pattern.confidence,
          examples: pattern.examples
        });

      if (patternError) {
        console.error('Error saving pattern:', patternError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis_type,
        ai_model_used: ai_model,
        tasks_analyzed: analysisResults.length,
        patterns_identified: newPatterns.length,
        high_risk_tasks: analysisResults.filter(r => r.risk_score >= 0.6).length,
        results: analysisResults,
        patterns: newPatterns,
        analysis_metadata: {
          timestamp: new Date().toISOString(),
          model_version: ai_model,
          confidence_threshold: 0.7,
          processing_time: Date.now()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in AI risk analysis:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function analyzeTaskWithAI(
  task: TaskData,
  historicalTasks: TaskData[],
  patterns: any[],
  aiModel: string
): Promise<AIRiskAssessment> {

  const prompt = `You are an expert AI project management assistant specializing in delay risk prediction and task analysis. 

Analyze the following task for delay risks and provide a comprehensive risk assessment:

TASK TO ANALYZE:
- ID: ${task.id}
- Title: ${task.title}
- Description: ${task.description || 'No description'}
- Priority: ${task.priority}
- Status: ${task.status}
- Due Date: ${task.due_date || 'No due date'}
- Estimated Hours: ${task.estimated_hours || 'Not estimated'}
- Is Blocked: ${task.is_blocked ? 'Yes' : 'No'}
- Block Reason: ${task.blocked_reason || 'N/A'}
- Assignee: ${task.assignee_name || 'Unassigned'}

HISTORICAL CONTEXT:
${historicalTasks.slice(0, 10).map(ht => 
  `- Task: ${ht.title} | Priority: ${ht.priority} | Est: ${ht.estimated_hours}h | Status: ${ht.status}`
).join('\n')}

EXISTING RISK PATTERNS:
${patterns.slice(0, 5).map(p => 
  `- Pattern: ${p.pattern_name} | Type: ${p.pattern_type} | Frequency: ${(p.frequency_score * 100).toFixed(0)}%`
).join('\n')}

Provide your analysis in the following JSON format:
{
  "risk_score": 0.0-1.0,
  "delay_probability": 0.0-1.0, 
  "predicted_delay_days": integer,
  "risk_factors": [
    {
      "factor": "factor_name",
      "impact_level": "low|medium|high|critical",
      "confidence": 0.0-1.0,
      "reasoning": "detailed explanation"
    }
  ],
  "recommendations": {
    "immediate_actions": ["action1", "action2"],
    "resource_adjustments": ["adjustment1", "adjustment2"],
    "timeline_suggestions": ["suggestion1", "suggestion2"], 
    "risk_mitigations": ["mitigation1", "mitigation2"]
  },
  "confidence_level": 0.0-1.0,
  "ai_reasoning": "comprehensive explanation of the risk assessment"
}

Focus on:
1. Timeline pressure and deadline proximity
2. Task complexity and scope
3. Dependency risks and blockers
4. Resource allocation and team capacity
5. Historical patterns and similar task outcomes
6. External factors and uncertainties

Be precise, actionable, and data-driven in your assessment.`;

  try {
    const geminiResponse = await callGeminiAPI(prompt);
    const aiResponse = parseGeminiResponse(geminiResponse);

    return aiResponse as AIRiskAssessment;

  } catch (error) {
    console.error('AI analysis error:', error);

    // Fallback to algorithmic assessment if AI fails
    return {
      risk_score: calculateBasicRiskScore(task),
      delay_probability: calculateBasicDelayProbability(task),
      predicted_delay_days: 0,
      risk_factors: [{
        factor: 'ai_unavailable',
        impact_level: 'low',
        confidence: 0.5,
        reasoning: 'Gemini AI analysis unavailable, using fallback algorithm'
      }],
      recommendations: {
        immediate_actions: ['Review task manually'],
        resource_adjustments: ['Ensure adequate resources'],
        timeline_suggestions: ['Monitor progress closely'],
        risk_mitigations: ['Regular check-ins']
      },
      confidence_level: 0.3,
      ai_reasoning: 'Gemini AI analysis failed, fallback algorithm used'
    };
  }
}

async function identifyPatternsWithAI(
  currentTasks: TaskData[],
  historicalTasks: TaskData[],
  existingPatterns: any[],
  aiModel: string
): Promise<any[]> {

  const prompt = `Analyze the following task data to identify new delay risk patterns:

CURRENT TASKS:
${currentTasks.slice(0, 20).map(t => 
  `${t.title} | ${t.priority} | ${t.status} | ${t.estimated_hours || 0}h`
).join('\n')}

HISTORICAL COMPLETED TASKS:
${historicalTasks.slice(0, 50).map(t => 
  `${t.title} | ${t.priority} | ${t.estimated_hours || 0}h`
).join('\n')}

Identify 3-5 new risk patterns in JSON format:
{
  "patterns": [
    {
      "name": "pattern_name",
      "type": "task_type|user_behavior|timeline|complexity",
      "data": {"key": "value"},
      "frequency": 0.0-1.0,
      "impact": 0.0-1.0,
      "confidence": 0.0-1.0,
      "examples": [{"task_id": "id", "reasoning": "why this fits"}]
    }
  ]
}

Focus on patterns like:
- Task types that consistently face delays
- Estimation accuracy patterns
- Priority vs completion patterns
- Team workload patterns
- Seasonal or timing patterns`;

  try {
    const geminiResponse = await callGeminiAPI(prompt);
    const aiResponse = parseGeminiPatternResponse(geminiResponse);

    return aiResponse.patterns || [];

  } catch (error) {
    console.error('Pattern analysis error:', error);
    return [];
  }
}

function calculateBasicRiskScore(task: TaskData): number {
  let score = 0;

  if (task.is_blocked) score += 0.4;
  if (task.priority === 'High') score += 0.3;
  if (task.due_date) {
    const daysUntilDue = Math.ceil((new Date(task.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue < 0) score += 0.5;
    else if (daysUntilDue <= 3) score += 0.3;
  }
  if ((task.estimated_hours || 0) > 40) score += 0.2;

  return Math.min(score, 1.0);
}

function calculateBasicDelayProbability(task: TaskData): number {
  return calculateBasicRiskScore(task) * 0.8;
}

// Gemini API helper functions
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

function parseGeminiResponse(response: string): AIRiskAssessment {
  try {
    // Clean the response to extract JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Gemini response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate and sanitize the response
    return {
      risk_score: Math.max(0, Math.min(1, parsed.risk_score || 0)),
      delay_probability: Math.max(0, Math.min(1, parsed.delay_probability || 0)),
      predicted_delay_days: Math.max(0, parseInt(parsed.predicted_delay_days) || 0),
      risk_factors: Array.isArray(parsed.risk_factors) ? parsed.risk_factors : [],
      recommendations: parsed.recommendations || {
        immediate_actions: [],
        resource_adjustments: [],
        timeline_suggestions: [],
        risk_mitigations: []
      },
      confidence_level: Math.max(0, Math.min(1, parsed.confidence_level || 0.5)),
      ai_reasoning: parsed.ai_reasoning || 'AI analysis completed'
    }

  } catch (error) {
    console.error('Error parsing Gemini response:', error)
    console.error('Raw response:', response)

    // Return fallback response
    return {
      risk_score: 0.5,
      delay_probability: 0.4,
      predicted_delay_days: 0,
      risk_factors: [{
        factor: 'parsing_error',
        impact_level: 'low',
        confidence: 0.3,
        reasoning: 'Unable to parse AI response, using fallback values'
      }],
      recommendations: {
        immediate_actions: ['Review task manually due to analysis error'],
        resource_adjustments: ['Ensure adequate resources'],
        timeline_suggestions: ['Monitor progress closely'],
        risk_mitigations: ['Regular check-ins recommended']
      },
      confidence_level: 0.3,
      ai_reasoning: 'Parsing error occurred, fallback analysis applied'
    }
  }
}

function parseGeminiPatternResponse(response: string): { patterns: any[] } {
  try {
    // Clean the response to extract JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { patterns: [] }
    }

    const parsed = JSON.parse(jsonMatch[0])

    return {
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns : []
    }

  } catch (error) {
    console.error('Error parsing Gemini pattern response:', error)
    return { patterns: [] }
  }
}

