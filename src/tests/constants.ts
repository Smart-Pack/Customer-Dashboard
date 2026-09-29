import type { User } from '@/api/modules/users'

export const mockUser: User = {
  id: 1,
  unique_id: '7b9f3c21-84d6-4a17-b2e8-51c7d9036f42',
  first_name: 'John',
  last_name: 'Doe',
  full_name: 'John Doe',
  email: 'john@example.com',
  phone: '+254712345678',
  profile_pic: null,
  account_type: 'internal',
  role: 'staff',
  date_of_birth: '2000-01-01',
  gender: 'male',
  changed_password_after_initial_login: true,
  created_at: '2026-09-15T12:33:13.497Z',
  updated_at: '2026-09-15T12:33:13.497Z',
  two_factor_enabled: true,
  status: 'active',
  is_active: true,
}
