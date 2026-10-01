Based on those dependencies, I’d structure the Admin Dashboard stack like this:

# Technology Stack

This document describes the technologies and tools used to develop and operate the SmartPack Customer Dashboard.

## Frontend

| Technology | Purpose                                    |
| ---------- | ------------------------------------------ |
| Axios      | HTTP client for API communication          |
| jwt-decode | — Decodes JSON Web Tokens (JWTs) to access their payload claims |
| Vue        | Frontend framework                         |
| TypeScript | Type-safe programming language             |
| Vite       | Frontend build tool and development server |
| Pinia      | State management                           |
| Tailwind CSS | Utility-first CSS framework |
| @tailwindcss/vite | Tailwind CSS integration for Vite |
| SweetAlert2 | — Alert, toast, and confirmation notifications |
| Vue Router | Client-side routing                        |
| VeeValidate | — Form validation and field state management |
| @vee-validate/rules | — Built-in validation rules for VeeValidate |
| Vue Tel Input | — International telephone number input with country selection and formatting |
| QRCode Vue 3 | `qrcode-vue3` | Vue 3 QR code generation component for displaying device/user QR codes |
| vue3-google-signin | Vue 3 Google Sign-In integration using Google Identity Services |

## Testing

| Tool           | Purpose                                  |
| -------------- | ---------------------------------------- |
| Vitest         | Unit and component testing               |
| Vue Test Utils | Vue component testing utilities          |
| jsdom          | Browser environment simulation for tests |

## Code Quality and Development Tools

| Tool                            | Purpose                                      |
| ------------------------------- | -------------------------------------------- |
| ESLint                          | Code linting                                 |
| Prettier                        | Code formatting                              |
| Oxlint                          | Fast JavaScript and TypeScript linting       |
| vue-tsc                         | Type checking for Vue and TypeScript         |
| `@vue/eslint-config-typescript` | ESLint configuration for TypeScript and Vue  |
| `eslint-plugin-vue`             | ESLint rules for Vue                         |
| `eslint-config-prettier`        | Prevents ESLint and Prettier rule conflicts  |
| pre-commit                      | Automated Git hooks for local quality checks |
| Git                             | Version control                              |
| GitHub                          | Repository and collaboration                 |
| Husky | Git hooks for automated pre-commit and pre-push quality checks |

## Development Environment

| Tool    | Purpose                             |
| ------- | ----------------------------------- |
| Node.js | JavaScript runtime                  |
| `pnpm`  | Package and dependency management   |
| VS Code | Recommended development environment |

## Deployment

| Technology | Purpose                                    |
| ---------- | ------------------------------------------ |
| Vercel     | Frontend hosting and continuous deployment |

## Planned Tools

Tools that are planned but not yet implemented should be documented separately or marked clearly as planned.

