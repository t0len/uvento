type User = {
  id: string;
  role: string;
};

type OwnedResource = {
  organizationId?: string;
  userId?: string;
};

type MembershipCheck = {
  organizationId: string;
  members?: { userId: string }[];
};

function isAdmin(user: User) {
  return user.role === "ADMIN";
}

function isOrganizer(user: User) {
  return user.role === "ORGANIZER";
}

function isOwner(user: User, resource: OwnedResource) {
  return resource.userId === user.id;
}

function isOrgMember(user: User, org: MembershipCheck) {
  return org.members?.some((m) => m.userId === user.id) ?? false;
}

// Events
export function canCreateEvent(user: User) {
  return isOrganizer(user);
}

export function canEditEvent(user: User, event: OwnedResource & MembershipCheck) {
  if (isAdmin(user)) return true;
  return isOrganizer(user) && isOrgMember(user, event);
}

export function canDeleteEvent(user: User, event: OwnedResource & MembershipCheck) {
  return canEditEvent(user, event);
}

export function canPublishEvent(user: User, event: OwnedResource & MembershipCheck) {
  return canEditEvent(user, event);
}

// Registrations
export function canViewRegistrations(user: User, event: OwnedResource & MembershipCheck) {
  if (isAdmin(user)) return true;
  return isOrganizer(user) && isOrgMember(user, event);
}

export function canCheckInAttendee(user: User, event: OwnedResource & MembershipCheck) {
  return canViewRegistrations(user, event);
}

export function canCancelRegistration(user: User, registration: OwnedResource) {
  if (isAdmin(user)) return true;
  return isOwner(user, registration);
}

// Organizations
export function canEditOrganization(user: User, org: MembershipCheck) {
  if (isAdmin(user)) return true;
  return isOrgMember(user, org);
}

// Users
export function canManageUsers(user: User) {
  return isAdmin(user);
}

export function canChangeRole(user: User) {
  return isAdmin(user);
}

// Payments
export function canRefundPayment(user: User, event: OwnedResource & MembershipCheck) {
  if (isAdmin(user)) return true;
  return isOrganizer(user) && isOrgMember(user, event);
}

// Blacklists
export function canManageBlacklist(user: User, org: MembershipCheck) {
  if (isAdmin(user)) return true;
  return isOrganizer(user) && isOrgMember(user, org);
}
