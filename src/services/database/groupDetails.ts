import repositories from './repositories'

import type { GroupMember, GroupDetail, GroupSmartPack } from '@/api/modules/groups'

/**
 * Retrieves a group's details, including its members and SmartPacks.
 *
 * @param id - Group ID.
 * @returns Group details or null when the group is not found.
 */
export async function get(id: number): Promise<GroupDetail | null> {
  const group = await repositories.groups.get(id)

  if (!group) {
    return null
  }

  const [cachedSmartPacks, cachedMembers] = await Promise.all([
    repositories.smartpacks.getByGroupId(id),
    repositories.groupMembers.getByGroupId(id),
  ])

  const smartpacks: GroupSmartPack[] = cachedSmartPacks.map(
    ({ cached_at: _cachedAt, ...smartpack }) => smartpack,
  )

  const members: GroupMember[] = cachedMembers.map(
    ({ group_id: _groupId, cached_at: _cachedAt, ...member }) => member,
  )

  return {
    id: group.id,
    name: group.name,
    members,
    smartpacks,
    created: group.created,
    updated: group.updated,
  }
}

/**
 * Saves a group's details and replaces its cached members and SmartPacks.
 *
 * @param group - Group details to cache.
 */
export async function save(group: GroupDetail): Promise<void> {
  await repositories.groups.save({
    id: group.id,
    name: group.name,
    total_smartpacks: group.smartpacks.length,
    total_users: group.members.length,
    created: group.created,
    updated: group.updated,
  })

  await repositories.groupMembers.replaceList(group.id, group.members)
}
