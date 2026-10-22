export function showsNoWorkspaceNotice(state: {
  isPlatformAdmin: boolean
  sessionLoaded: boolean
  hasActiveCompany: boolean
}): boolean {
  return (
    state.sessionLoaded &&
    !state.hasActiveCompany &&
    !state.isPlatformAdmin
  )
}
