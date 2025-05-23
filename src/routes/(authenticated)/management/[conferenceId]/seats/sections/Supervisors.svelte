<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import SeatsTableSection from '../SeatsTableSection.svelte';
	import { graphql, type SeatsQuery$result } from '$houdini';
	import { type getUserInfo$result } from '$houdini/artifacts/getUserInfo';
	import InitialsButton from '../InitialsButton.svelte';
	import DownloadSupervisorDataBtn from '../downloads/DownloadSupervisorDataBtn.svelte';
	import AddParticipantBtn from '../AddParticipantBtn.svelte';

	interface Props {
		supervisors: SeatsQuery$result['findManyConferenceSupervisors'];
		conferenceId: string;
	}

	let { supervisors, conferenceId }: Props = $props();

	const addConferenceSupervisorMutation = graphql(`
		mutation addConferenceSupervisor(
			$userId: ID!
			$conferenceId: ID!
			$plansOwnAttendenceAtConference: Boolean!
		) {
			createOneConferenceSupervisor(
				userId: $userId
				conferenceId: $conferenceId
				plansOwnAttendenceAtConference: $plansOwnAttendenceAtConference
			) {
				id
			}
		}
	`);

	let user = $state<Partial<getUserInfo$result['previewUserByIdOrEmail']> | undefined>(undefined);
	let plansOwnAttendenceAtConference = $state(false);

	const addParticipant = async () => {
		if (!user?.id) return;
		await addConferenceSupervisorMutation.mutate({
			userId: user.id,
			conferenceId: conferenceId,
			plansOwnAttendenceAtConference
		});
	};
</script>

{#snippet downloadSupervisorDataBtn()}
	<DownloadSupervisorDataBtn {conferenceId} />
{/snippet}

<SeatsTableSection title={m.supervisors()} downloadButton={downloadSupervisorDataBtn}>
	<thead>
		<tr>
			<td>
				<i class="fa-duotone fa-users"></i>
			</td>
			<td>
				<i class="fa-duotone fa-sigma"></i>
			</td>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>
				{#if supervisors.length > 0}
					<div class="flex flex-wrap gap-1">
						{#each supervisors as supervisor}
							<InitialsButton
								given_name={supervisor.user.given_name}
								family_name={supervisor.user.family_name}
								href={`/management/${conferenceId}/participants?filter=${supervisor.user.id}`}
							/>
						{/each}

						{#snippet plansOwnAttendenceCheck()}
							<div class="form-control">
								<label class="label cursor-pointer">
									<span class="label-text mr-4">{m.supervisorPlansOwnAttendance()}</span>
									<input
										type="checkbox"
										bind:checked={plansOwnAttendenceAtConference}
										class="checkbox"
									/>
								</label>
							</div>
						{/snippet}

						<AddParticipantBtn
							bind:user
							targetRole={m.supervisor()}
							{addParticipant}
							formElements={[plansOwnAttendenceCheck]}
						/>
					</div>
				{:else}
					<i class="fas fa-dash text-gray-400"></i>
				{/if}
			</td>
			<td>
				{supervisors.length ?? 0}
			</td>
		</tr>
	</tbody>
</SeatsTableSection>
