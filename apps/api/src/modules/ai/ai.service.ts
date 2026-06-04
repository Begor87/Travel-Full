import { prisma } from '../../database/prisma.js';
import { assertTripAccess } from '../trips/trips.service.js';
import { logger } from '../../shared/utils/logger.js';

interface AiProvider {
  complete(prompt: string, systemPrompt?: string): Promise<string>;
}

class OpenAIProvider implements AiProvider {
  private client: { chat: { completions: { create: Function } } } | null = null;

  private async getClient() {
    if (!this.client) {
      const { default: OpenAI } = await import('openai');
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return this.client;
  }

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const client = await this.getClient();
    const model = process.env.AI_MODEL ?? 'gpt-4o-mini';

    const response = await client.chat.completions.create({
      model,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return response.choices[0]?.message?.content ?? '';
  }
}

function getProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER ?? 'openai';
  if (provider === 'openai') return new OpenAIProvider();
  throw new Error(`Unknown AI provider: ${provider}`);
}

const AI_SYSTEM_PROMPT = `You are a knowledgeable and practical travel planning assistant.
You help users optimise their travel itineraries, find gaps, suggest improvements, and provide actionable travel advice.
Always provide specific, actionable recommendations. Be concise and structured in your responses.
Format responses with clear sections when appropriate.`;

export async function optimiseDay(
  tripId: string,
  dayId: string,
  userId: string,
) {
  await assertTripAccess(tripId, userId);

  const day = await prisma.itineraryDay.findUnique({
    where: { id: dayId },
    include: {
      events: {
        orderBy: [{ order: 'asc' }, { startTime: 'asc' }],
        include: { bookingRefs: true },
      },
    },
  });

  if (!day) return { suggestion: 'Day not found' };

  const eventsDescription = day.events
    .map((e) => {
      const time = e.startTime
        ? `${e.startTime.toISOString().slice(11, 16)} - ${e.endTime?.toISOString().slice(11, 16) ?? 'end unknown'}`
        : 'no time set';
      const location = e.locationName ?? 'location unknown';
      return `- ${e.title} (${e.category.toLowerCase()}, ${time}, ${location})`;
    })
    .join('\n');

  const prompt = `Please analyse and optimise this travel day itinerary:

Date: ${day.date.toISOString().slice(0, 10)}
${day.title ? `Day title: ${day.title}` : ''}

Events:
${eventsDescription || 'No events planned'}

Provide:
1. Identification of any timing issues, conflicts, or inefficiencies
2. Suggestions to optimise the schedule (travel time, logical ordering, realistic timing)
3. Any missing elements (meals, transfers, rest)
4. An improved schedule if the current one has issues`;

  try {
    const provider = getProvider();
    const suggestion = await provider.complete(prompt, AI_SYSTEM_PROMPT);
    return { suggestion, dayId };
  } catch (error) {
    logger.error('AI optimisation failed', { error });
    return { suggestion: 'AI analysis is temporarily unavailable. Please try again later.', dayId };
  }
}

export async function findItineraryGaps(tripId: string, userId: string) {
  await assertTripAccess(tripId, userId);

  const [trip, days] = await Promise.all([
    prisma.trip.findUnique({
      where: { id: tripId },
      include: { destinations: true },
    }),
    prisma.itineraryDay.findMany({
      where: { tripId },
      include: {
        events: { orderBy: [{ order: 'asc' }, { startTime: 'asc' }] },
      },
      orderBy: { date: 'asc' },
    }),
  ]);

  if (!trip) return { suggestion: 'Trip not found' };

  const destinations = trip.destinations.map((d) => d.name).join(', ');
  const daysSummary = days.map((d) => {
    const eventCount = d.events.length;
    const eventsList = d.events.map((e) => e.title).join(', ');
    return `${d.date.toISOString().slice(0, 10)}: ${eventCount} events${eventsList ? ` (${eventsList})` : ' - empty'}`;
  }).join('\n');

  const prompt = `Analyse this travel itinerary and identify gaps and opportunities:

Trip: ${trip.title}
Destinations: ${destinations}
Duration: ${trip.startDate.toISOString().slice(0, 10)} to ${trip.endDate.toISOString().slice(0, 10)}

Daily breakdown:
${daysSummary}

Provide:
1. Days with too few activities (potential gaps)
2. Days that might be overpacked
3. Missing essential activities (check-in/check-out, airport transfers)
4. Balanced suggestions for filling gaps based on the destinations`;

  try {
    const provider = getProvider();
    const suggestion = await provider.complete(prompt, AI_SYSTEM_PROMPT);
    return { suggestion, tripId };
  } catch (error) {
    logger.error('AI gap analysis failed', { error });
    return { suggestion: 'AI analysis is temporarily unavailable.', tripId };
  }
}

export async function suggestActivities(
  tripId: string,
  userId: string,
  query: string,
) {
  await assertTripAccess(tripId, userId);

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { destinations: true },
  });

  if (!trip) return { suggestions: [] };

  const destinations = trip.destinations.map((d) => d.name).join(', ');

  const prompt = `Suggest travel activities for a trip to ${destinations}.

User request: ${query}

Trip dates: ${trip.startDate.toISOString().slice(0, 10)} to ${trip.endDate.toISOString().slice(0, 10)}
Trip category: ${trip.category.toLowerCase()}

Provide 5-8 specific, practical activity suggestions with:
- Activity name
- Brief description (1-2 sentences)
- Estimated duration
- Best time of day
- Practical tips`;

  try {
    const provider = getProvider();
    const suggestion = await provider.complete(prompt, AI_SYSTEM_PROMPT);
    return { suggestion, destinations };
  } catch (error) {
    logger.error('AI suggestions failed', { error });
    return { suggestion: 'AI suggestions are temporarily unavailable.', destinations };
  }
}

export async function generatePackingList(tripId: string, userId: string) {
  await assertTripAccess(tripId, userId);

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      destinations: true,
      days: {
        include: {
          events: { select: { category: true, title: true } },
        },
      },
    },
  });

  if (!trip) return { list: [] };

  const categories = [...new Set(
    trip.days.flatMap((d) => d.events.map((e) => e.category.toLowerCase()))
  )];

  const prompt = `Generate a comprehensive packing list for this trip:

Destination(s): ${trip.destinations.map((d) => d.name).join(', ')}
Duration: ${trip.days.length} days
Activities planned: ${categories.join(', ')}
Category: ${trip.category.toLowerCase()}

Create a packing list organised by category (documents, clothing, toiletries, electronics, etc.)
Be specific and practical. Include items people commonly forget.`;

  try {
    const provider = getProvider();
    const list = await provider.complete(prompt, AI_SYSTEM_PROMPT);
    return { list };
  } catch (error) {
    logger.error('AI packing list failed', { error });
    return { list: 'AI assistance is temporarily unavailable.' };
  }
}
