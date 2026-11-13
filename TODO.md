# TODO

## Asset-specific wallet addresses

- [x] Store and manage a wallet address and network for each supported asset, preserving existing users' assigned deposit address, asset, and network through legacy-address fallback.
- [x] In **Fund & buy**, show the address and network for the asset the user selects to buy, keeping the displayed asset, network, address, and copy action in sync.
- [x] In **Receive crypto**, let users select a supported asset and show that asset's assigned address and network. Keep the copy action and send-only warning in sync.
- [x] In the admin dashboard, let admins select an asset and network, add or edit its wallet address, and save the update so it persists and is reflected in both user flows.
- [x] Handle assets without an assigned address clearly; do not show another asset's address as a fallback.
- [x] Verify the frontend build and backend syntax. Purchase and deposit behavior remains within the app's existing preview-only model.
