// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// const WorkboxWebpackPlugin = require('workbox-webpack-plugin');
// const isProduction = process.env.NODE_ENV == 'production';


module.exports = {
    entry: {
        main: './src/app.ts',
        testwebgl: './src/testwebgl/testwebgl.ts',
        testwebgpu: './src/testwebgpu/testwebgpu.ts',
        testthreejswebgl: './src/testthreejswebgl/testthreejswebgl.ts',
        testthreejswebgpu: './src/testthreejswebgpu/testthreejswebgpu.ts',
        testthreejspolygon: './src/testthreejspolygon/testthreejspolygon.ts',
    },

    mode: "development",
    devtool: "inline-source-map",
    // output: {
    //     filename: "main.js",
    //     path: path.resolve(__dirname, 'dist'),
    // },
    output: {
        filename: "[name].js",  // Will generate main.js, subpage1.js, subpage2.js
        path: path.resolve(__dirname, 'dist'),
    },
    // devServer: {
    //     open: true,
    //     host: 'localhost',
    // },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    plugins: [
        // new HtmlWebpackPlugin({
        //     template: 'index.html',
        // }),
        new HtmlWebpackPlugin({
            template: 'index.html',
            filename: 'index.html',  // Output the main page as index.html
            chunks: ['main'],  // Only include the main.js script in the index.html
        }),
        // Plugin to generate subpage1.html
        new HtmlWebpackPlugin({
            template: './src/testwebgl/testwebgl.html',
            filename: 'testwebgl.html',  // Output as subpage1.html
            chunks: ['testwebgl'],  // Include subpage1.js script only
        }),
        // Plugin to generate subpage2.html
        new HtmlWebpackPlugin({
            template: './src/testwebgpu/testwebgpu.html',
            filename: 'testwebgpu.html',  // Output as subpage2.html
            chunks: ['testwebgpu'],  // Include subpage2.js script only
        }),
        // Plugin to generate subpage2.html
        new HtmlWebpackPlugin({
            template: './src/testthreejswebgl/testthreejswebgl.html',
            filename: 'testthreejswebgl.html',  // Output as subpage2.html
            chunks: ['testthreejswebgl'],  // Include subpage2.js script only
        }),
        // Plugin to generate subpage2.html
        new HtmlWebpackPlugin({
            template: './src/testthreejswebgpu/testthreejswebgpu.html',
            filename: 'testthreejswebgpu.html',  // Output as subpage2.html
            chunks: ['testthreejswebgpu'],  // Include subpage2.js script only
        }),
        // Plugin to generate subpage2.html
        new HtmlWebpackPlugin({
            template: './src/testthreejspolygon/testthreejspolygon.html',
            filename: 'testthreejspolygon.html',  // Output as subpage2.html
            chunks: ['testthreejspolygon'],  // Include subpage2.js script only
        }),
    ],
    module: {
        rules: [
            {
                test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
                type: 'asset',
            },
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            }
        ],
    },
};

// module.exports = () => {
//     if (isProduction) {
//         config.mode = 'production';
        
        
//         config.plugins.push(new WorkboxWebpackPlugin.GenerateSW());
        
//     } else {
//         config.mode = 'development';
//     }
//     return config;
// };
