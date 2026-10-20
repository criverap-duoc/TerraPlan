import http from 'k6/http';
import { check, fail } from 'k6';
import { Counter } from 'k6/metrics';

// Every VU races for the same three resources on the same window, only the campaign differs.
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@terraplan.local';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'Admin1234!';
const VUS = Number(__ENV.VUS || 20);
const SLOT_MINUTES = 120;
const TRANSPORT_MINUTES = 90;

// 409 is the expected answer for the losers: only transport errors and 5xx count as failures.
http.setResponseCallback(http.expectedStatuses(200, 201, 409));

export const created = new Counter('race_created');
export const conflicts = new Counter('race_conflicts');

export const options = {
  scenarios: {
    race: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: '3m',
      gracefulStop: '10s',
    },
  },
  thresholds: {
    race_created: ['count==1'],
    race_conflicts: [`count==${VUS - 1}`],
    http_req_failed: ['rate<0.01'],
  },
};

function isCreated(status) {
  return status === 200 || status === 201;
}

function jsonHeaders(token) {
  return { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
}

function login() {
  const response = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (response.status !== 200) {
    fail(`Login failed with ${response.status}: ${response.body}`);
  }

  return response.json('accessToken');
}

function firstId(path, token) {
  const response = http.get(`${BASE_URL}${path}`, jsonHeaders(token));

  if (response.status !== 200) {
    fail(`GET ${path} failed with ${response.status}: ${response.body}`);
  }

  const id = response.json('data.0.id');
  if (!id) {
    fail(`GET ${path} returned no rows; run pnpm --filter api seed:all first`);
  }

  return id;
}

// A fixed future range keeps every VU on the same window; the exact date does not matter.
function raceWindow() {
  const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  start.setUTCMinutes(0, 0, 0);

  return {
    startsAt: start.toISOString(),
    endsAt: new Date(start.getTime() + SLOT_MINUTES * 60 * 1000).toISOString(),
  };
}

export function setup() {
  const token = login();
  const siteId = firstId('/sites?page=1&pageSize=1', token);
  const technicianId = firstId('/technicians?page=1&pageSize=1', token);
  const equipmentId = firstId('/equipment?page=1&pageSize=1', token);
  const vehicleId = firstId('/vehicles?page=1&pageSize=1', token);
  const parameterCodes = http
    .get(`${BASE_URL}/catalog/parameters`)
    .json()
    .slice(0, 2)
    .map((parameter) => parameter.code);
  const window = raceWindow();
  const runId = Date.now().toString(36).toUpperCase();
  const campaignIds = [];

  for (let index = 0; index < VUS; index += 1) {
    const code = `K6-${runId}-${String(index + 1).padStart(2, '0')}`;
    const campaignResponse = http.post(
      `${BASE_URL}/campaigns`,
      JSON.stringify({ code, siteId, parameterCodes }),
      jsonHeaders(token),
    );

    if (!isCreated(campaignResponse.status)) {
      fail(`POST /campaigns failed with ${campaignResponse.status}: ${campaignResponse.body}`);
    }

    const campaignId = campaignResponse.json('id');
    const windowsResponse = http.post(
      `${BASE_URL}/campaigns/${campaignId}/windows`,
      JSON.stringify({
        windows: [{ ...window, transportMinutes: TRANSPORT_MINUTES, holdingDeadline: null }],
      }),
      jsonHeaders(token),
    );

    if (!isCreated(windowsResponse.status)) {
      fail(`POST /campaigns/:id/windows failed with ${windowsResponse.status}`);
    }

    const selectResponse = http.post(
      `${BASE_URL}/campaigns/${campaignId}/select-window`,
      JSON.stringify({ windowId: windowsResponse.json('windows.0.id') }),
      jsonHeaders(token),
    );

    if (!isCreated(selectResponse.status)) {
      fail(`POST /campaigns/:id/select-window failed with ${selectResponse.status}`);
    }

    campaignIds.push(campaignId);
  }

  return { token, campaignIds, technicianId, equipmentId, vehicleId, window };
}

export default function (data) {
  const campaignId = data.campaignIds[__VU - 1];
  const response = http.post(
    `${BASE_URL}/campaigns/${campaignId}/reservations`,
    JSON.stringify({
      technicianId: data.technicianId,
      equipmentId: data.equipmentId,
      vehicleId: data.vehicleId,
      ...data.window,
    }),
    jsonHeaders(data.token),
  );

  if (response.status === 201) {
    created.add(1);
  }
  if (response.status === 409) {
    conflicts.add(1);
  }

  check(response, { one_created: (r) => r.status === 201 });
  check(response, { rest_conflict: (r) => r.status === 409 });
}
