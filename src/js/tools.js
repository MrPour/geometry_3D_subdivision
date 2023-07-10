import defaultConst from './const.js';
export default {
// 将图形初始化到屏幕中央
   normalizeGeometry(geom) {
        // 计算边界范围- 得到半径和物体中心
        geom.computeBoundingSphere();
        //用球半径求比例尺因子
        const scaleFactor = defaultConst.defaultRadius / geom.boundingSphere.radius;
        // 用比例尺因子缩放所有的顶点
        for (let i = 0, il = geom.vertices.length; i < il; ++i) {
            geom.vertices[i].multiplyScalar(scaleFactor);
        }
        // 重新计算边界范围
        geom.computeBoundingSphere();
        // 使用它的中心作为偏移的几何中心
        let offset = geom.boundingSphere.center;
        offset.negate();
        for (let i = 0, il = geom.vertices.length; i < il; ++i) {
            geom.vertices[i].add(offset);
        }
        // 再次计算
        geom.computeBoundingSphere();
    },

    formLoadBufferGeometry(buffer)
    {
        let geometry = new THREE.Geometry().fromBufferGeometry(buffer);
        geometry.computeFaceNormals();
        geometry.mergeVertices();
        geometry.computeVertexNormals();
        return geometry;
    }


}