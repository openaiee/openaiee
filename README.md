<p align="center">
  <img width="160" src="./assets/ee.png" />
  <h2 align="center">OepnaiEE</h2>
  <p align="center">OepnaiEE：一键连接大模型，简单高效！</p>
</p>

## 概览

OepnaiEE 是一个专为简化在多个平台上部署机器学习模型的试验性项目。本项目支持与多个 API 服务集成，包括 OpenAI、Groq、Gemini 和 Claude，使其能够在 Vercel 和 Netlify 等平台上快速部署。虽然已进行优化，OepnaiEE 仍具有实验性质，因此在使用过程中需要谨慎，所有使用后果均需用户自行承担。

## 部署选项

### 通过 Vercel 部署

我们推荐使用 Vercel 进行最简单的部署。点击下面开始：

[![通过 Vercel 部署](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/agicto/openaiee)

### 通过 Netlify 部署

Netlify 是另一个不错的部署选项：

[![部署至 Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/agicto/openaiee)

## 配置说明

部署完成后，请按照以下方式配置服务端点：

### OpenAI 配置

将 `baseURL` 从默认的 OpenAI URL 更改为您部署的服务 URL。

```diff
export API_KEY="您的 API 密钥"
- export BASE_URL="https://api.openai.com/v1"
+ export BASE_URL="您的部署 URL/v1"
```

### Gemini 配置

对于 Gemini API，请相应地更新基本 URL。

```diff
export API_KEY="您的 API 密钥"
- export BASE_URL="https://generativelanguage.googleapis.com/v1beta"
+ export BASE_URL="您的部署 URL/v1beta"
```

### Groq 配置

对于 Groq 的 API 服务，调整 URL 如下所示。

```diff
export API_KEY="您的 API 密钥"
- export BASE_URL="https://api.groq.com/openai/v1"
+ export BASE_URL="您的部署 URL/openai/v1"
```

### Claude 配置

对于部署 Anthropic 的 Claude，请这样修改基本 URL：

```diff
export API_KEY="您的 API 密钥"
- export BASE_URL="https://api.anthropic.com/v1"
+ export BASE_URL="您的部署 URL/v1"
```

## 其它部署

如果您使用 NGINX 部署，请参考 NGINX 文件夹内的 `nginx.conf` 配置；如果是 Cloudflare 配置，请参考 worker 文件夹内的 `index.js`。

## 支持项目

如果您发现这个实现有用，或者它在您的项目中提供了帮助，请考虑在 GitHub 上给它一个星标。您的支持非常有帮助！

🌟 感谢您使用 OepnaiEE！