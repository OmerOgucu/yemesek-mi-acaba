export default async function* reporter(source) {
  for await (const event of source) {
    if (event.type !== 'test:pass' && event.type !== 'test:fail') continue;
    const data = event.data || {};
    if (!data.file || !data.name || data.name === data.file) continue;
    const status = event.type === 'test:fail' ? 'fail' : data.skip || data.todo ? 'skip' : 'pass';
    yield `${JSON.stringify({ file: data.file, name: data.name, status })}\n`;
  }
}
