import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDCDeriveType } from '$api/auth/oidc';

export const defineAbilitiesForConference = (
	oidc: OIDCDeriveType,
	{ can }: AbilityBuilder<AppAbility>
) => {
	can(['list', 'read'], 'Conference');

	if (oidc && oidc.user) {
		const user = oidc.user;
		can(['update', 'delete'], 'Conference', {
			teamMembers: { some: { user: { id: user.sub }, role: 'PROJECT_MANAGEMENT' } }
		});
	}
};
