export interface Service {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: string;
}

export interface Specialist {
  id: string;
  name: string;
  role: string;
  availabilityLabel: string;
}

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  caption: string;
}

export interface Review {
  id: string;
  quote: string;
  author: string;
  rating: number;
}

export interface BookingRequest {
  serviceId: string;
  specialistId: string;
  date: string;
  time: string;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
}

export interface BookingResponse {
  bookingId: string;
  status: 'confirmed' | 'pending';
}
