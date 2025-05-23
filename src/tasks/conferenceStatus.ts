import schedule from 'node-schedule';
import { config } from './config';
import { tasksDb } from './tasksDb';
import { IncomingWebhook } from '@slack/webhook';
import { logLoading, logTaskEnd, logTaskStart, taskWarning } from './logs';
import { conferenceStats } from '$api/services/stats';
import fs from 'fs';
import { getLocale } from '$lib/paraglide/runtime';

// GLOBALS

const TASK_NAME = 'Conference Status Slack Notification';
const CRON = '0 0 9,20 * * *';

// HELPER FUNCTIONS

function formatConferenceDate(date: Date) {
	return date.toLocaleDateString(getLocale(), {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	});
}

function formatHistoricComparison(historicStat: number | undefined, currentStat: number) {
	const diff = historicStat ? currentStat - historicStat : undefined;
	return historicStat && diff
		? `${currentStat} (${diff > 0 ? '+' : '-'}${Math.abs(diff)})`
		: `${currentStat}`;
}

function readHistoricStats(conferenceId: string) {
	try {
		const historicStatsRaw = fs.readFileSync(`./empheralData/${conferenceId}.json`, 'utf8');
		return historicStatsRaw ? JSON.parse(historicStatsRaw) : undefined;
	} catch (error) {
		console.info('No historic stats found. Continuing without...');
		return undefined;
	}
}

function writeHistoricStats(conferenceId: string, stats: Record<string, any>) {
	try {
		if (!fs.existsSync('./ephemeralData')) {
			fs.mkdirSync('./ephemeralData');
		}
		fs.writeFileSync(`./ephemeralData/${conferenceId}.json`, JSON.stringify(stats));
	} catch (error) {
		console.error("Couldn't save stats to file", error);
	}
}

// MAIN TASK

if (config.SLACK_NOTIFICATION_WEBHOOK) {
	const webhook = new IncomingWebhook(config.SLACK_NOTIFICATION_WEBHOOK!);

	logLoading(TASK_NAME, CRON);

	const _conferenceStatusSlackNotifiaction = schedule.scheduleJob(
		// TODO: we should allow passing the TZ via env var to the container
		{ rule: CRON, tz: 'Etc/GMT-2' },
		async function () {
			const startTime = logTaskStart(TASK_NAME);

			const conferencesWithOpenRegistration = await tasksDb.conference.findMany({
				where: {
					state: {
						equals: 'PARTICIPANT_REGISTRATION'
					},
					startAssignment: {
						gte: new Date()
					}
				}
			});

			for (const conference of conferencesWithOpenRegistration) {
				const { countdowns, registrationStatistics: rs } = await conferenceStats({
					db: tasksDb,
					conferenceId: conference.id
				});

				// import historic stats from file
				const hs: typeof rs | undefined = readHistoricStats(conference.id);

				try {
					await webhook.send({
						blocks: [
							{
								type: 'header',
								text: {
									type: 'plain_text',
									text: `Konferenz-Update: ${conference.title}`
								}
							},
							{
								type: 'rich_text',
								elements: [
									{
										type: 'rich_text_section',
										elements: [
											{
												type: 'text',
												text: conference.startConference
													? `Noch ${countdowns.daysUntilConference} Tage bis zur Konferenz (Start am ${formatConferenceDate(conference.startConference)})`
													: 'Kein Konferenzdatum festgelegt'
											}
										]
									},
									{
										type: 'rich_text_section',
										elements: [
											{
												type: 'text',
												text: conference.startAssignment
													? `Anmeldung noch ${countdowns.daysUntilEndRegistration} Tage offen (bis ${formatConferenceDate(conference.startAssignment)})`
													: 'Kein Anmeldeschluss festgelegt'
											}
										]
									},
									{
										type: 'rich_text_section',
										elements: [
											{
												type: 'text',
												text: ' '
											}
										]
									},
									{
										type: 'rich_text_section',
										elements: [
											{
												style: { bold: true },
												type: 'text',
												text: `Anmeldungen Gesamt: `
											},
											{
												type: 'text',
												style: { code: true, bold: true },
												text: formatHistoricComparison(hs?.total, rs.total)
											}
										]
									},
									{
										type: 'rich_text_section',
										elements: [
											{
												type: 'text',
												text: `Offene Anmeldungen: `
											},
											{
												type: 'text',
												style: { code: true },
												text: formatHistoricComparison(hs?.notApplied, rs.notApplied)
											}
										]
									},
									{
										type: 'rich_text_section',
										elements: [
											{
												type: 'text',
												text: `Abgeschlossene Anmeldungen: `
											},
											{
												type: 'text',
												style: { code: true },
												text: formatHistoricComparison(hs?.applied, rs.applied)
											}
										]
									},
									{
										type: 'rich_text_section',
										elements: [
											{
												type: 'text',
												text: ' '
											}
										]
									}
								]
							},
							{
								type: 'divider'
							},
							{
								type: 'rich_text',
								elements: [
									{
										type: 'rich_text_section',
										elements: [
											{
												style: { bold: true },
												type: 'text',
												text: `Delegationen`
											}
										]
									},
									{
										type: 'rich_text_section',
										elements: [
											{
												type: 'text',
												text: `Gesamt: `
											},
											{
												type: 'text',
												style: { code: true, bold: true },
												text: formatHistoricComparison(
													hs?.delegationMembers.total,
													rs.delegationMembers.total
												)
											},
											{
												type: 'text',
												text: ` Teilnehmende in `
											},
											{
												type: 'text',
												style: { code: true, bold: true },
												text: formatHistoricComparison(hs?.delegations.total, rs.delegations.total)
											},
											{
												type: 'text',
												text: ` Delegationen`
											}
										]
									},
									{
										type: 'rich_text_section',
										elements: [
											{
												type: 'text',
												text: `Offene Anmeldungen: `
											},
											{
												type: 'text',
												style: { code: true },
												text: formatHistoricComparison(
													hs?.delegationMembers.notApplied,
													rs.delegationMembers.notApplied
												)
											},
											{
												type: 'text',
												text: ` Teilnehmende in `
											},
											{
												type: 'text',
												style: { code: true },
												text: formatHistoricComparison(
													hs?.delegations.notApplied,
													rs.delegations.notApplied
												)
											},
											{
												type: 'text',
												text: ` Delegationen`
											}
										]
									},
									{
										type: 'rich_text_section',
										elements: [
											{
												type: 'text',
												text: `Abgeschlossene Anmeldungen: `
											},
											{
												type: 'text',
												style: { code: true },
												text: formatHistoricComparison(
													hs?.delegationMembers.applied,
													rs.delegationMembers.applied
												)
											},
											{
												type: 'text',
												text: ` Teilnehmende in `
											},
											{
												type: 'text',
												style: { code: true },
												text: formatHistoricComparison(
													hs?.delegations.applied,
													rs.delegations.applied
												)
											},
											{
												type: 'text',
												text: ` Delegationen`
											}
										]
									},
									{
										type: 'rich_text_section',
										elements: [
											{
												type: 'text',
												text: ' '
											}
										]
									}
								]
							},
							{
								type: 'divider'
							},
							{
								type: 'rich_text',
								elements: [
									{
										type: 'rich_text_section',
										elements: [
											{
												style: { bold: true },
												type: 'text',
												text: `Einzelbewerbungen`
											}
										]
									},
									{
										type: 'rich_text_section',
										elements: [
											{
												type: 'text',
												text: `Gesamt: `
											},
											{
												type: 'text',
												style: { code: true, bold: true },
												text: formatHistoricComparison(
													hs?.singleParticipants.total,
													rs.singleParticipants.total
												)
											}
										]
									},
									{
										type: 'rich_text_section',
										elements: [
											{
												type: 'text',
												text: `Offene Anmeldungen: `
											},
											{
												type: 'text',
												style: { code: true },
												text: formatHistoricComparison(
													hs?.singleParticipants.notApplied,
													rs.singleParticipants.notApplied
												)
											}
										]
									},
									{
										type: 'rich_text_section',
										elements: [
											{
												type: 'text',
												text: `Abgeschlossene Anmeldungen: `
											},
											{
												type: 'text',
												style: { code: true },
												text: formatHistoricComparison(
													hs?.singleParticipants.applied,
													rs.singleParticipants.applied
												)
											}
										]
									},
									{
										type: 'rich_text_section',
										elements: [
											{
												type: 'text',
												text: ' '
											}
										]
									},
									{
										type: 'rich_text_list',
										elements: rs.singleParticipants.byRole.map((role) => ({
											type: 'rich_text_section',
											elements: [
												{
													type: 'text',
													text: `${role.role}: `
												},
												{
													type: 'text',
													style: { code: true, bold: true },
													text: formatHistoricComparison(
														hs?.singleParticipants.byRole.find(
															(hsRole) => hsRole.role === role.role
														)?.total,
														role.total
													)
												},
												{
													type: 'text',
													text: `   |   `
												},
												{
													type: 'text',
													style: { code: true },
													text: formatHistoricComparison(
														hs?.singleParticipants.byRole.find(
															(hsRole) => hsRole.role === role.role
														)?.notApplied,
														role.notApplied
													)
												},
												{
													type: 'text',
													text: ` offen   |   `
												},
												{
													type: 'text',
													style: { code: true },
													text: formatHistoricComparison(
														hs?.singleParticipants.byRole.find(
															(hsRole) => hsRole.role === role.role
														)?.applied,
														role.applied
													)
												},
												{
													type: 'text',
													text: ` abgeschlossen`
												}
											]
										})),
										style: 'bullet',
										border: 1
									},
									{
										type: 'rich_text_section',
										elements: [
											{
												type: 'text',
												text: ' '
											}
										]
									}
								]
							},
							{
								type: 'divider'
							},
							{
								type: 'rich_text',
								elements: [
									{
										type: 'rich_text_section',
										elements: [
											{
												style: { bold: true },
												type: 'text',
												text: `Betreuer*innen`
											}
										]
									},
									{
										type: 'rich_text_section',
										elements: [
											{
												type: 'text',
												text: `Angemeldete Betreuer*innen: `
											},
											{
												type: 'text',
												style: { code: true, bold: true },
												text: formatHistoricComparison(hs?.supervisors, rs.supervisors)
											}
										]
									},
									{
										type: 'rich_text_section',
										elements: [
											{
												type: 'text',
												text: ' '
											}
										]
									}
								]
							},
							{
								type: 'divider'
							}
						]
					});

					console.info(`Slack notification for ${conference.title} sent`);

					// save stats to file
					writeHistoricStats(conference.id, rs);
				} catch (error) {
					console.error(`Slack notification for ${conference.title} errored`, error);
				}
			}

			logTaskEnd(TASK_NAME, startTime);
		}
	);
} else {
	taskWarning(
		TASK_NAME,
		'You need to specify the SLACK_NOTIFICATION_WEBHOOK env to use the slack bot!'
	);
}
