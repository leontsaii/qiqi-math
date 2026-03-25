export async function onRequestPost({ request, env }) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { audio, format } = await request.json();

    if (!env.DASHSCOPE_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Use Qwen3-ASR-Flash with OpenAI compatible protocol
    // Supports direct base64 audio input
    const mimeType = format === 'webm' ? 'audio/webm' :
                     format === 'mp4' ? 'audio/mp4' :
                     format === 'wav' ? 'audio/wav' : 'audio/webm';

    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen3-asr-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'input_audio',
                input_audio: {
                  data: `data:${mimeType};base64,${audio}`
                }
              }
            ]
          }
        ],
        stream: false,
        asr_options: {
          enable_itn: false,
          language: 'en'
        }
      })
    });

    const result = await response.json();

    // Extract text from OpenAI-compatible response
    let text = '';
    if (result.choices && result.choices[0] && result.choices[0].message) {
      text = result.choices[0].message.content || '';
    }

    return new Response(JSON.stringify({ text, raw: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
