//加载OBJ模型方法,加载到数组里
function loadAsset(predefinedName, assetUrl) {
    objLoader.load(assetUrl,
        function(object) {
            let geom = object.children[0].geometry;
            let stdGeom = new THREE.Geometry().fromBufferGeometry(geom);
            stdGeom.computeFaceNormals();
            stdGeom.mergeVertices();
            stdGeom.computeVertexNormals();
            normalizeGeometry(stdGeom);
            predefinedGeometries[predefinedName] = stdGeom;
        }
    );
}