import { defineConfig } from 'astro/config';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const isProjectPagesSite =
  process.env.GITHUB_ACTIONS === 'true' &&
  repositoryName &&
  !repositoryName.toLowerCase().endsWith('.github.io');

export default defineConfig({
  output: 'static',
  // A project Pages site is served from /<repository-name>/, while local
  // development and a <user>.github.io repository are served at the root.
  base: isProjectPagesSite ? `/${repositoryName}` : '/'
});
