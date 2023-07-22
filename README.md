# TiniJS Build PWA

:x: DEPRICATED, will move functions to the CLI.

A ParcelJS reporter for building PWA assets.

## Install & usage

This package will be installed automatically by the `@tinijs/cli`.

Use in the `.parcelrc`

```js
{
  "extends": "@parcel/config-default",
  "reporters":  ["...", "@tinijs/parcel-reporter-build-pwa"]
}
```

For more, please visit: <https://tinijs.dev>

## Development

- Create a home for TiniJS: `mkdir TiniJS && cd TiniJS`
- Fork the repo: `git clone https://github.com/tinijs/parcel-reporter-build-pwa.git`
- Install dependencies: `cd parcel-reporter-build-pwa && npm i`
- Make changes & build locally: `npm run build && npm pack`
- Push changes & create a PR 👌

## License

**@tinijs/parcel-reporter-build-pwa** is released under the [MIT](https://github.com/tinijs/parcel-reporter-build-pwa/blob/master/LICENSE) license.
