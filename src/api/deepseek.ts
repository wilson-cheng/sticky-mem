const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  system?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export class DeepseekClient {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey.trim();
  }

  async chat(messages: Message[], options: ChatOptions = {}): Promise<string> {
    const {
      system,
      temperature = 0.7,
      maxTokens = 1024,
      model = DEFAULT_MODEL,
    } = options;

    const fullMessages: Message[] = [];
    if (system) {
      fullMessages.push({ role: 'system', content: system });
    }
    fullMessages.push(...messages);

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorMessage = errorBody?.error?.message || response.statusText;
      throw new Error(`DeepSeek API error ${response.status}: ${errorMessage}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
