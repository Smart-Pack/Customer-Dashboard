import type { User } from '@/api/modules/users'
import type { SmartPack } from '@/api/modules/smartpacks'

export const mockUser: User = {
  id: 1,
  unique_id: '7b9f3c21-84d6-4a17-b2e8-51c7d9036f42',
  first_name: 'John',
  last_name: 'Doe',
  full_name: 'John Doe',
  email: 'john@example.com',
  phone: '+254712345678',
  profile_pic: null,
  account_type: 'customer',
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

export const mockSmartPack: SmartPack = {
  id: 1,
  device_uid: 'SP-001',
  hardware_model: 'SmartPack V1',
  imei: '123456789012345',
  firmware_version: '1.0.0',
  last_seen: '2026-10-02T08:00:00Z',
  is_online: true,
  assigned_to: null,
  child_name: 'Zuri',
  created: '2026-10-01T08:00:00Z',
  updated: '2026-10-02T08:00:00Z',
}
