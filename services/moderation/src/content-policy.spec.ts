import { collectPolicyIssues, inspectText } from './content-policy';

describe('inspectText', () => {
  it('allows a normal complaint', () => {
    expect(
      inspectText('Balık soğuktu, toplam hesapta olmayan kalem vardı. Garson tersledi.').ok,
    ).toBe(true);
  });

  it('rejects phone numbers, emails, and long id-like digits', () => {
    expect(inspectText('Beni 0532 111 22 33 ten aradılar').ok).toBe(false);
    expect(inspectText('yazın ali@example.com').ok).toBe(false);
    expect(inspectText('tc 10000000146 diye bir şey gördüm').ok).toBe(false);
  });

  it('rejects door numbers in address hints only', () => {
    const hint = inspectText('Moda Cad. No: 12', { addressHint: true });
    expect(hint.ok).toBe(false);
    expect(inspectText('Moda sahil').ok).toBe(true);
    expect(inspectText('Hesapta 12 lira fazla çıktı').ok).toBe(true);
  });

  it('rejects slurs and threats', () => {
    expect(inspectText('garson tam bir orospu çocuğu').ok).toBe(false);
    expect(inspectText('sahibini gebertirim').ok).toBe(false);
  });
});

describe('collectPolicyIssues', () => {
  it('dedupes repeated messages', () => {
    const issues = collectPolicyIssues([
      { value: 'ara 05321112233' },
      { value: 'ya da 0544 000 11 22' },
    ]);
    expect(issues).toHaveLength(1);
  });
});
