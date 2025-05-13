# Passports Ticket Status

This ticket-status monitor joins Gitlab (or other source control management), Jenkins, and Jira statuses into a single dashboard visualisation.

There are two types of pages to be aware of whilst running the `passports-ticket-status` app.

The first page is the project list. This is a simple page which contains a list of all the projects that has been added.

![A sample picture of the project list page](/public/project_list.png)

The second page is the ticket status dashboard for the service you have selected from the project list.

![A sample picture of the ticket status dashboard](/public/ticket_dashboard.png)

The visualisations of the ticket-status dashboard are useful for tracking development work in progress when multiple teams may be working on the same services at once, or across multiple services at once.

On this screen, users can view the status of Jira tickets at a glance, seeing data such as:
- The Jira status of the ticket and what kind of ticket it is - for example, a regular ticket, a CHORE or a config change.
- What Jenkins build version is attached to the Jira tickets code change(s) and when the build was created after being merged into a code repository.
- Which environments the Jenkins build has been deployed to.
- If other tickets might block a release—such as when two developers are working on the same service, and one ticket depends on the other's changes—this can be shown on the dashboard. For example, if Developer A adds a new web page and Developer B is writing browser tests that rely on it, Ticket B should be promoted only after Ticket A. The dashboard can highlight this dependency.

## Usage

### Running the app

You can run the ticket status dashboard on a local port using `npm start`.
This will bring up an empty project list.

Logging for the dashboard is output to the running dev terminal via the `hmpo-logger` dependency.

### Customising the app

This ticket-status monitor uses React to render views for this apps frontend.

The `list.jsx` renders the project list page, and `main.jsx` renders the template for the ticket-status dashboard.

These pages pull in other components used to present project data - for example, `main.jsx` uses the Layout component to present each release with a Jenkins version, the date when it was created, the build Id and hyperlinks to different environment promotions for each successful Jenkins build.

### Integrating other services

Services are integrated via `data.js` under `/lib`. This file gets project data, or allows a user to add project data.
Importantly, it uses the `merged-apis` class which co-ordinates data from multiple APIs like Bitbucket, Gitlab (or other SCM), Jira and Jenkins to provide data on different stages of the development workflow. Key helper methods in this class include functions which:
- Link Jira tickets to projects.
- Get release, Gitlab and Jenkins build information, including build data deployed to different environments.
- Clean up methods to remove duplicated tickets or to stop empty tickets from being added to the dashboard.

### Authorisation, access and storage

If user authorisation via approved usernames and passwords is required, these values can be obtained from different kinds of storage.

The `storage` file provides a temporary in-cache memory which it can call on via a get function, or set with an optional time-to-live value.
There's also two classes which can help persist this temporary data:
- The `storage-file` file persists data to a local file, acting as a cache. It can load or save cached data, such as usernames or passwords for quick local testing.
- The `storage-redis` file enables a connection to a Redis client via a key string which can store and retrieve data from Redis using an optional time-to-live value, it can query username and passwords in the database and authenticate against them.

The Redis engine config can be changed via the `default.yaml` config in the `/config` folder.

The `auth` file in `/routes` handles login form submissions, validating that all required crendetials are provided, otherwise rendering a log in page.

### Testing

After adding your own unit tests to this project, you can run linting and unit tests via `npm test`.

## Future upgrades
- `express-react-views` is no longer maintained, and its functionality should be replaced with a modern method of server-side rendering such as Next.js.
- Remove `.travis.yml` and its usages which are used in CI tests each time changes are pushed to Gitlab, and replace this with a suite of unit tests to ensure app stability.
- Add husky test commit hooks to bring this app in line with other HMPO apps, ensuring linting and unit tests are ran before each before each Git push.
- Update this README.md with an example of integrating services and seeing these integrations work when running this app locally.

