export type Visibility = 'public' | 'followers' | 'selected' | 'private'
export interface ProfessionalProfile {
  id: string
  displayName: string
  professionalTitle: string
  specialties: string[]
  countryCode: string
  region?: string
  city?: string
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected'
}
export interface Post {
  id: string
  authorId: string
  body: string
  categoryId: string
  visibility: Visibility
  createdAt: string
}
