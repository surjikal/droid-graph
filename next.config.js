/** @type {import('next').NextConfig} config */
module.exports = {
    reactStrictMode: false,
    webpack: (config, _) => {
        config.module.rules.push({
            test: /\.ini$/i,
            loader: 'raw-loader',
        });
        return config;
    },
};
