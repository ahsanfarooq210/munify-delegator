// API Return Types

export interface StatsType {
	countdowns: Countdowns;
	registered: Registered;
	age: Age;
	status?: Status;
}

export interface Countdowns {
	daysUntilConference?: number | undefined;
	daysUntilEndRegistration?: number | undefined;
}

export interface Registered {
	total: number;
	notApplied: number;
	applied: number;
	delegations: delegations;
	delegationMembers: DelegationMembers;
	singleParticipants: SingleParticipants;
	supervisors: number;
}

export interface delegations {
	total: number;
	notApplied: number;
	applied: number;
	withSupervisor: number;
}

export interface DelegationMembers {
	total: number;
	notApplied: number;
	applied: number;
}

export interface SingleParticipants {
	total: number;
	notApplied: number;
	applied: number;
	byRole: ByRole[];
}

export interface ByRole {
	role: string;
	fontAwesomeIcon?: string | undefined | null;
	total: number;
	applied: number;
	notApplied: number;
}

export interface Age {
	average?: number;
	distribution: { key: string; value: number }[];
}

export interface StatsTypeHistoryEntry {
	stats: StatsType;
	timestamp: string;
	conferenceId: string;
}

export interface Status {
	postalStatus: StatusObject;
	paymentStatus: StatusObject;
	didAttend: number;
}

export interface StatusObject {
	problem: number;
	done: number;
}

// Filter (by applied, not applied)

let filter = $state<'all' | 'applied' | 'notApplied'>('all');

export function registrationFilter() {
	const setFilter = (newFilter: 'all' | 'applied' | 'notApplied') => {
		filter = newFilter;
	};
	const getFilter = () => {
		return filter;
	};

	const getFilteredValue = (
		object:
			| {
					total: number;
					applied: number;
					notApplied: number;
					[key: string]: any;
			  }
			| undefined
	) => {
		if (!object) return undefined;
		switch (filter) {
			case 'all':
				return object.total;
			case 'applied':
				return object.applied;
			case 'notApplied':
				return object.notApplied;
		}
	};
	return {
		setFilter,
		getFilter,
		getFilteredValue
	};
}

// Local Store History

let history = $state<StatsTypeHistoryEntry[] | undefined>(undefined);
let selectedHistory = $state<string | undefined>(undefined);

export function getHistory() {
	return history;
}

export function setHistory(newHistory: StatsTypeHistoryEntry[]) {
	history = newHistory;
}

export function getSelectedHistory() {
	return selectedHistory;
}

export function setSelectedHistory(newSelectedHistory: string | undefined) {
	selectedHistory = newSelectedHistory;
}
