import { describe, it, expect } from "vitest"
import { showsNoWorkspaceNotice } from "@/lib/shell-view"
import { routes } from "@/lib/routes"

/**
 * Regression tests for the Super Admin console.
 *
 * A platform administrator has no company membership on purpose, so the
 * shell used to replace the Super Admin console with the "no company
 * workspace" notice. The decision is mirrored here exactly as the shell
 * evaluates it, so the branch order is part of the test.
 */
type ShellState = {
  platformOnly: boolean
  pathname: string
  isPlatformAdmin: boolean
  sessionLoaded: boolean
  hasActiveCompany: boolean
}

function shellContent(state: ShellState) {
  if (state.platformOnly && state.pathname !== routes.admin) {
    return "platform-notice"
  }
  if (
    showsNoWorkspaceNotice({
      isPlatformAdmin: state.isPlatformAdmin,
      sessionLoaded: state.sessionLoaded,
      hasActiveCompany: state.hasActiveCompany,
    })
  ) {
    return "no-workspace-notice"
  }
  return "content"
}

const platformAdmin: ShellState = {
  platformOnly: true,
  pathname: routes.admin,
  isPlatformAdmin: true,
  sessionLoaded: true,
  hasActiveCompany: false,
}

describe("showsNoWorkspaceNotice", () => {
  it("does not show the notice to a platform administrator on the admin route", () => {
    expect(shellContent(platformAdmin)).toBe("content")
  })

  it("keeps the platform notice for a platform administrator on other routes", () => {
    expect(
      shellContent({ ...platformAdmin, pathname: routes.dashboard }),
    ).toBe("platform-notice")
  })

  it("shows the notice to a normal account without a company", () => {
    expect(
      shellContent({
        platformOnly: false,
        pathname: routes.dashboard,
        isPlatformAdmin: false,
        sessionLoaded: true,
        hasActiveCompany: false,
      }),
    ).toBe("no-workspace-notice")
  })

  it("does not show the notice to a normal account with an active company", () => {
    expect(
      shellContent({
        platformOnly: false,
        pathname: routes.dashboard,
        isPlatformAdmin: false,
        sessionLoaded: true,
        hasActiveCompany: true,
      }),
    ).toBe("content")
  })

  it("waits for the session before it shows the notice", () => {
    expect(
      shellContent({
        platformOnly: false,
        pathname: routes.dashboard,
        isPlatformAdmin: false,
        sessionLoaded: false,
        hasActiveCompany: false,
      }),
    ).toBe("content")
  })
})
