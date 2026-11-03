import type { DigestNight } from '../digest/types.js';

function valueOrDash(value: string | null): string {
  return value === null || value === '' ? '—' : value;
}

export function DigestPage({ night, digest }: { night: string; digest: DigestNight }) {
  return (
    <>
      <h1>digest · {night}</h1>
      <p class="mute">malformed lines: {digest.badLines}</p>
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th><th>owner</th><th>runs</th><th>retries</th>
              <th>last status</th><th>last error</th><th>first at</th><th>last at</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((row) => {
              const warning = row.retries >= 3 || row.lastStatus === 'fail';
              return (
                <tr>
                  <td class={warning ? 'warn' : undefined}>{row.job || '—'}</td>
                  <td>{valueOrDash(row.owner)}</td>
                  <td>{row.runs}</td>
                  <td class={row.retries >= 3 ? 'warn' : undefined}>{row.retries}</td>
                  <td class={row.lastStatus === 'fail' ? 'warn' : undefined}>{row.lastStatus}</td>
                  <td>{valueOrDash(row.lastError)}</td>
                  <td>{valueOrDash(row.firstAt)}</td>
                  <td>{valueOrDash(row.lastAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
