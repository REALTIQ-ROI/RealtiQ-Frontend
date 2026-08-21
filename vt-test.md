# Virtual Tour Local Testing

Use the following provider demo data only for local development and testing. Do not save it as production listing data, and do not add provider demo-data packages to the production frontend.

## Realsee

The official Realsee sample can be used to exercise the complete viewer flow and allow the backend to resolve the tour as ready.

Enter these values in the Property Virtual Tour management form:

```text
Work ID: 07bdc58f413bc5494f05c7cbb5cbdce4
Signed Work JSON URL: https://vr-public.realsee-cdn.cn/release/static/image/release/five/work-sample/07bdc58f413bc5494f05c7cbb5cbdce4/work.json
VR URL: leave blank
```

The sample CDN is not included in the backend's default Realsee host allowlist. Add the following setting to the **backend's local environment file**, not the frontend environment:

```env
REALSEE_ALLOWED_HOSTS=vr-public.realsee-cdn.cn
```

Restart the backend after changing its environment. Then submit the Realsee configuration from the Property management screen and refresh the Property details page.

The backend must successfully retrieve and validate the Work JSON before the tour becomes `ready`. When ready, the Property summary should report `virtualTour.available: true`, and the public Virtual Tour modes and eligible virtual-tour request option should become available.

Reference: [Realsee — Displaying a Work](https://open-platform.realsee.com/developer/docs/five/handbook/react/displaying-work/)

## Matterport

Matterport's public SDK example can be used for an initial form and integration test:

```text
Model SID: JGPnGQ6hosj
Showcase URL: https://my.matterport.com/show/?m=JGPnGQ6hosj
```

Reference: [Matterport SDK quick-start](https://matterport.github.io/showcase-sdk/sdkbundle_quickstart.html)

This public model may test configuration submission without becoming a usable `ready` tour:

- Without `MATTERPORT_API_TOKEN_ID` and `MATTERPORT_API_TOKEN_SECRET` on the backend, validation is deferred and the record remains `processing`.
- With Model API credentials, the model must be accessible to the associated Matterport account or validation can fail.
- Rendering requires a public, domain-restricted Matterport SDK key supplied by the backend. Private Model API credentials must never be placed in frontend environment files, source code, logs, or browser requests.

For a complete Matterport test, create a Matterport developer or sandbox account, obtain its demo-model SID and a domain-restricted SDK key, and configure the server-side Model API credentials. See [Matterport Model API examples](https://matterport.github.io/showcase-sdk/modelapi_snippets.html).

## Recommended Test Path

1. Start with the Realsee sample because it can exercise the complete ready-tour flow without requiring your own captured Property.
2. Add `REALSEE_ALLOWED_HOSTS` to the backend environment and restart the backend.
3. Configure Realsee for a test Property using the values above.
4. Confirm the tour becomes `ready` and the Property reports it as available.
5. Open Property Details and activate **3D Tour** to verify that provider code is loaded only on demand.
6. Confirm that selecting the paid booking tour type **Virtual Tour** automatically fixes the mode to **Virtual**.
7. Disable or remove availability and confirm users can no longer request a virtual tour for that Property.
8. Use the Matterport sample for form/deferred-processing checks until an account-accessible model and SDK key are available.

Do not manually mark a provider `ready` through the frontend or send status and capability fields in configuration requests. The backend owns provider status, capabilities, validation, and resolved-provider selection.
