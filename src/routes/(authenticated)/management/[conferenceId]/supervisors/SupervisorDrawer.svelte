<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Drawer from '$lib/components/Drawer.svelte';
	import { graphql } from '$houdini';
	import type { SupervisorDrawerQueryVariables } from './$houdini';
	import { error } from '@sveltejs/kit';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import formatNames from '$lib/services/formatNames';

	interface Props {
		conferenceId: string;
		supervisorId: string;
		open?: boolean;
		onClose?: () => void;
	}
	let { supervisorId, open = $bindable(false), onClose, conferenceId }: Props = $props();

	export const _SupervisorDrawerQueryVariables: SupervisorDrawerQueryVariables = () => {
		return {
			supervisorId: supervisorId
		};
	};

	const supervisorQuery = graphql(`
		query SupervisorDrawerQuery($supervisorId: String!) @load {
			findUniqueConferenceSupervisor(where: { id: $supervisorId }) {
				id
				plansOwnAttendenceAtConference
				user {
					id
					given_name
					family_name
				}
				delegations {
					id
					applied
					entryCode
					school
					members {
						id
					}
				}
			}
		}
	`);
</script>

<Drawer
	bind:open
	{onClose}
	category={m.supervisor()}
	title={formatNames(
		$supervisorQuery?.data?.findUniqueConferenceSupervisor?.user?.given_name,
		$supervisorQuery?.data?.findUniqueConferenceSupervisor?.user?.family_name,
		{ givenNameFirst: false }
	)}
	id={$supervisorQuery?.data?.findUniqueConferenceSupervisor?.id ?? 'N/A'}
	loading={$supervisorQuery.fetching}
>
	{#if $supervisorQuery?.data?.findUniqueConferenceSupervisor?.plansOwnAttendenceAtConference}
		<div class="alert alert-success">
			<i class="fas fa-location-check"></i>
			{m.supervisorPlansOwnAttendance()}
		</div>
	{:else}
		<div class="alert alert-info">
			<i class="fas fa-cloud"></i>
			{m.supervisorDoesNotPlanOwnAttendance()}
		</div>
	{/if}
	<div class="flex flex-col">
		<h3 class="text-xl font-bold">{m.delegations()}</h3>
		<div class="overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						<th></th>
						<th></th>
						<th></th>
						<th></th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#if $supervisorQuery?.data?.findUniqueConferenceSupervisor?.delegations?.length ?? 0 > 0}
						{#each $supervisorQuery?.data?.findUniqueConferenceSupervisor?.delegations ?? [] as delegation}
							<tr>
								<td>
									{#if delegation.applied}
										<i class="fa-solid fa-circle-check text-success"></i>
									{:else}
										<i class="fa-solid fa-hourglass-half text-error"></i>
									{/if}
								</td>
								<td class="font-mono">
									{delegation.entryCode}
								</td>
								<td>
									{delegation.members.length}
								</td>
								<td>
									{delegation.school}
								</td>
								<td>
									<a
										class="btn btn-sm"
										href={`/management/${conferenceId}/delegations?filter=${delegation.id}`}
										aria-label="Details"
									>
										<i class="fa-duotone fa-arrow-up-right-from-square"></i>
									</a>
								</td>
							</tr>
						{/each}
					{:else}
						<tr>
							<td>{m.noDelegationsFound()}</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.adminActions()}</h3>
		<a
			class="btn"
			href={`/management/${conferenceId}/participants?filter=${$supervisorQuery?.data?.findUniqueConferenceSupervisor?.user.id}`}
		>
			{m.adminUserCard()}
			<i class="fa-duotone fa-arrow-up-right-from-square"></i>
		</a>
	</div>
</Drawer>
