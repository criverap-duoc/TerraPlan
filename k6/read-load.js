import http from 'k6/http';
import { check, fail } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@terraplan.local';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'Admin1234!';
const VUS = Number(__ENV.VUS || 30);
const DURATION = __ENV.DURATION || '30s';

export const options = {
  scenarios: {
    read: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
      gracefulStop: '5s',
    },
  },
  thresholds: {
    'http_req_duration{endpoint:campaigns-list}': ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const response = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  if (response.status !== 200) {
    fail(`Login failed with ${response.status}: ${response.body}`);
  }

  return { token: response.json('accessToken') };
}

export default function (data) {
  const response = http.get(`${BASE_URL}/campaigns?page=1&pageSize=25`, {
    headers: { Authorization: `Bearer ${data.token}` },
    tags: { endpoint: 'campaigns-list' },
  });

  check(response, { 'status is 200': (r) => r.status === 200 });
}
