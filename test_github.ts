import 'dotenv/config';
import { Octokit } from '@octokit/rest';

async function test() {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const { data } = await octokit.search.issuesAndPullRequests({ q: `is:pr author:shuding` });
  console.log('Total PRs:', data.total_count);
  const sample = data.items.find(i => i.state === 'closed');
  if (sample) {
    console.log('Sample closed PR pull_request object:', sample.pull_request);
  }
}
test();
