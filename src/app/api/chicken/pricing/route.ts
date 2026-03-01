import { NextRequest } from 'next/server';
import { getAllChickenPricing, getChickenPricing } from '@/lib/queries/chicken';
import { apiOk, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const country = searchParams.get('country');

  if (country) {
    const pricing = await getChickenPricing(country);
    if (!pricing) return apiError('No pricing available', 404);
    const response = apiOk(pricing);
    response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300');
    return response;
  }

  const pricing = await getAllChickenPricing();
  const response = apiOk(pricing);
  response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300');
  return response;
}
