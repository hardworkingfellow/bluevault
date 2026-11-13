export function getWalletDetails(user, ticker) {
  const addresses = user?.depositAddresses
  if (addresses && Object.hasOwn(addresses, ticker)) {
    const entry = addresses[ticker]
    return {
      address: typeof entry?.address === 'string' ? entry.address : '',
      network: typeof entry?.network === 'string' ? entry.network : '',
    }
  }

  if ((user?.depositAsset || 'USDT') === ticker) {
    return {
      address: user.depositAddress || '',
      network: user.network || '',
    }
  }

  return { address: '', network: '' }
}
