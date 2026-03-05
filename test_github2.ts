import 'dotenv/config';
import { Octokit } from '@octokit/rest';

async function test() {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const [total, merged, open, closed_unmerged] = await Promise.all([
    octokit.search.issuesAndPullRequests({ q: `is:pr author:mohitdebian`, per_page: 1 }),
    octokit.search.issuesAndPullRequests({ q: `is:pr is:merged author:mohitdebian`, per_page: 1 }),
    octokit.search.issuesAndPullRequests({ q: `is:pr is:open author:mohitdebian`, per_page: 1 }),
    octokit.search.issuesAndPullRequests({ q: `is:pr is:closed is:unmerged author:mohitdebian`, per_page: 1 })
  ]);
  console.log('Total PRs:', total.data.total_count);
  console.log('Merged PRs:', merged.data.total_count);
  console.log('Open PRs:', open.data.total_count);
  console.log('Closed Unmerged PRs:', closed_unmerged.data.total_count);
}
test();
