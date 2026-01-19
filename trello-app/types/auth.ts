export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  bio: string | null;
  contactInfo: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface ApiError {
  error: string;
  details?: string;
}
