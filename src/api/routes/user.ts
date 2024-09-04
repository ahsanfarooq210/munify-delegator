import Elysia, { t } from 'elysia';
import { db } from '$db/db';
import { UserPlain, UserPlainInputUpdate } from '$db/generated/schema/User';
import { permissionsPlugin } from '$api/auth/permissions';
import { CRUDMaker } from '$api/util/crudmaker';
import { dynamicPublicConfig } from '$config/public';

export const user = new Elysia({
	normalize: true
})
	.use(CRUDMaker.getAll('user'))
	.use(CRUDMaker.getOne('user'))
	.use(CRUDMaker.createOne('user'))
	.use(CRUDMaker.updateOne('user'))
	.use(CRUDMaker.deleteOne('user'))
	.use(permissionsPlugin)
	.patch(
		'/user/upsert-after-login',
		async ({ permissions }) => {
			const user = permissions.mustBeLoggedIn();

			if (!user.email || !user.family_name || !user.given_name || !user.preferred_username) {
				throw new Error('OIDC result is missing required fields!');
			}

			const updatedUser = await db.user.upsert({
				where: { id: user.sub },
				create: {
					id: user.sub,
					email: user.email,
					family_name: user.family_name,
					given_name: user.given_name,
					preferred_username: user.preferred_username,
					locale: user.locale ?? dynamicPublicConfig.DEFAULT_LOCALE
				},
				update: {
					email: user.email,
					family_name: user.family_name,
					given_name: user.given_name,
					preferred_username: user.preferred_username,
					locale: user.locale ?? dynamicPublicConfig.DEFAULT_LOCALE
				}
			});

			//TODO can this be done more elegantly?
			if (
				!updatedUser.birthday ||
				!updatedUser.phone ||
				!updatedUser.street ||
				!updatedUser.apartment ||
				!updatedUser.zip ||
				!updatedUser.city ||
				!updatedUser.country ||
				!updatedUser.gender ||
				!updatedUser.pronouns ||
				!updatedUser.foodPreference
			) {
				return { userNeedsAdditionalInfo: true };
			}

			return { userNeedsAdditionalInfo: false };
		},
		{
			response: t.Object({ userNeedsAdditionalInfo: t.Boolean() })
		}
	)
	.get(
		'/user/me',
		async ({ permissions }) => {
			const user = permissions.mustBeLoggedIn();
			return db.user.findFirstOrThrow({ where: { id: user.sub } });
		},
		{
			response: UserPlain
		}
	)
	.patch(
		'/user/me',
		async ({ permissions, body }) => {
			const user = permissions.mustBeLoggedIn();
			return db.user.update({ where: { id: user.sub }, data: body });
		},
		{
			body: UserPlainInputUpdate,
			response: UserPlain
		}
	);