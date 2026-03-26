import { NextResponse } from 'next/server';
import axios from 'axios';

// Default Voice ID - can easily be changed here for the entire app
const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Bella - warm, multilingual female voice

export async function POST(req: Request) {
  try {
    const { text, voice_id = DEFAULT_VOICE_ID } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!process.env.ELEVEN_API_KEY) {
      console.warn("ELEVEN_API_KEY is missing in backend environment.");
      return NextResponse.json(
        { error: 'Server configuration error: Missing API Key' },
        { status: 500 }
      );
    }

    const response = await axios({
      method: 'POST',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVEN_API_KEY,
      },
      data: {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          use_speaker_boost: true
        }
      },
      responseType: 'arraybuffer'
    });

    // Return the audio buffer to the frontend
    return new NextResponse(response.data, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store, max-age=0'
      }
    });

  } catch (error: any) {
    console.error('Error generating TTS:', error.response?.data?.toString() || error.message);
    return NextResponse.json(
      { error: 'Failed to generate audio' },
      { status: error.response?.status || 500 }
    );
  }
}
