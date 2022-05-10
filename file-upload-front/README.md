## 初始化

```js
npm init -y
git init
```

## 代码规范

### editorconfig

https://EditorConfig.org

### lint (eslint + stylelint + prettier)

本项目使用了 `@umijs/fabric` **注意**

- 其中 eslint 还需要下载额外的包
  ```json
    "eslint-plugin-jest",
    "eslint-plugin-react",
    "eslint-plugin-react-hooks",
    "eslint-plugin-unicorn",
  ```
- stylelint 不可用（包含了已经移除的配置，暂未更新）

### husky + lint-staged + commitlint

husky 需要在 npm-script 增加 `"prepare": "husky install"`

- husky 配合 lint-staged: `npx husky add .husky/pre-commit "npx lint-staged"`
  ```json
  "lint-staged": {
    "*.{ts,tsx,js}": [
      "eslint --config .eslintrc.js"
    ],
    "*.{css,less,scss}": [
      "stylelint --config .stylelintrc.js"
    ],
    "*.{ts,tsx,js,json,html,yml,css,less,scss,md}": [
      "prettier --write"
    ]
  }
  ```
- husky 配合 commitlint: `npx husky add .husky/commit-msg "npx --no -- commitlint --edit $1"`

### npm scripts

```json
{
  "lint:fix": "eslint --fix --cache --ext .js,.jsx,.ts,.tsx --format=pretty ./src && npm run lint:style",
  "lint:js": "eslint --cache --ext .js,.jsx,.ts,.tsx --format=pretty ./src",
  "lint:prettier": "prettier -c --write \"src/**/*\" --end-of-line auto",
  "lint:style": "stylelint \"src/**/*.less\" --custom-syntax postcss-less"
}
```

- 其中`lint: prettier`需要下载 `postcss-less`

## changelog

- 安装
  ```shell
  npm install conventional-changelog-cli
  ```
- 在 npm script 增加
  ```json
  "changelog": "conventional-changelog -p angular -i CHANGELOG.md -s",
  ```

## webpack 插件

```ts
/** 将 CSS 提取到单独的文件中 */
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
/** 压缩 css */
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
/** 生成 HTML 文件 */
const HtmlWebpackPlugin = require('html-webpack-plugin');
/** 可视化 webpack 输出文件大小 */
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
/** 压缩JavaScript */
const TerserJSPlugin = require('terser-webpack-plugin');
/** 编译时 ts 类型检查 */
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
```
