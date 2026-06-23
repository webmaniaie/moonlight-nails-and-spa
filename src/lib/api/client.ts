import type { BookingRequest, BookingResponse, GalleryImage, Review, Service, Specialist } from '../contracts';

const apiBase = import.meta.env.PUBLIC_API_BASE_URL || '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init
  });

  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export const api = {
  services: () => request<Service[]>('/services'),
  specialists: () => request<Specialist[]>('/specialists'),
  gallery: () => request<GalleryImage[]>('/gallery'),
  reviews: () => request<Review[]>('/reviews'),
  createBooking: (booking: BookingRequest) => request<BookingResponse>('/bookings', {
    method: 'POST',
    body: JSON.stringify(booking)
  })
};
