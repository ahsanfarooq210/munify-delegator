/// <references types="houdini-svelte">

/** @type {import('houdini').ConfigFile} */
const config = {
	watchSchema: {
		url: 'http://localhost:5173/api/graphql'
	},
	plugins: {
		'houdini-svelte': {
			forceRunesMode: true
		}
	},
	exclude: ['src/lib/paraglide/**/*'],
	scalars: {
		DateTime: {
			type: 'Date',
			unmarshal(val) {
				return val ? new Date(val) : null;
			},
			marshal(date) {
				return date && date.getTime();
			}
		},
		JSONObject: {
			type: 'JSONObject',
			unmarshal(val) {
				return JSON.parse(val);
			},
			marshal(val) {
				return JSON.stringify(val);
			}
		}
	},
	types: {
		Nation: {
			keys: ['alpha3Code', 'alpha2Code']
		}
	}
};

export default config;
