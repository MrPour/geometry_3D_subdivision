//path是nodeJS的一个内置模块
const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require("html-webpack-plugin")
const CopyPlugin = require('copy-webpack-plugin')
module.exports = {
    //生成的bundle文件格式便于查看
    mode:"development",
    //入口js文件
    entry: './src/index.js',
    output: {
        //打包文件地址
        filename: "bundle.js",
        //打包文件路径 __dirname js 文件所处的绝对路径
        path: path.resolve(__dirname,"./dist")
    },
    plugins: [
        //自动为指定的html配套插入script标签引入bundle.js文件（由于可能存在使用哈希值作为打包文件名的场景）
        new HtmlWebpackPlugin({
            //要插入js文件的名称和地址
            filename: "index.html",
            template: "./src/index.html"
        }),
        //设置全局变量
        new webpack.ProvidePlugin({
            THREE:'three',
            dat:'dat.gui',
            Detector:'./threejs/js/Detector.js'
        }),
        //将obj文件拷贝到dist目录下
        new CopyPlugin({
            patterns:[
                {
                    from:'./assets', to:path.resolve(__dirname,"./dist/assets"),
                }]
        })
    ],
    devServer: {
        hot: false,
    }
}