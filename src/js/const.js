//导出一个对象
export default {
     tetrahedron : "四面体",
     cube : "立方体",
     sphere : "球体",
     icosahedron : "二十面体",
     dodecahedron : "十二面体",
     plane : "平面",
     cone : "圆锥体",
     torus : "六边环",
     teapot : "茶杯",
     bunny : "兔子",
    //几何图形的默认半径
     defaultRadius : 4,
    // 细分等级最大值
    subdivMax : 8,
    uint32Max : 4294967295,
    startTime : Date.now(),
    infoDirty : false,

    //预定义的几何图形
    predefinedGeometries : [],
    //预定义的材质
    predefineMaterials : [],
    //定义图形选择下拉框
    geometriesNamesSelected : [
        "四面体",
        "立方体",
        "球体",
        "二十面体",
        "十二面体",
        "平面",
        "圆锥体",
        "六边环",
        "茶杯",
        "兔子",
        "OBJ file..."
],
    //定义材质选择下拉框
    materialNamesSelected : [
    'phongFlat',
    'phongSmooth',
    'lambert',
    'normal',
     ],
    loadPredefinedGeometries(){
        this.predefinedGeometries[this.tetrahedron] = new THREE.TetrahedronGeometry(this.defaultRadius);
        this.predefinedGeometries[this.cube] = new THREE.BoxGeometry(this.defaultRadius, this.defaultRadius, this.defaultRadius);
        this.predefinedGeometries[this.sphere] = new THREE.SphereGeometry(this.defaultRadius, 16, 9);
        this.predefinedGeometries[this.icosahedron] = new THREE.IcosahedronGeometry(this.defaultRadius);
        this.predefinedGeometries[this.dodecahedron] = new THREE.DodecahedronGeometry(this.defaultRadius);
        this.predefinedGeometries[this.plane] = new THREE.PlaneGeometry(this.defaultRadius * 2, 2, 2, 2);
        this.predefinedGeometries[this.cone] = new THREE.ConeGeometry(this.defaultRadius, 8, 8);
        this.predefinedGeometries[this.torus] = new THREE.TorusGeometry(this.defaultRadius, 1);
        this.predefinedGeometries[this.sphere].mergeVertices();
        this.predefinedGeometries[this.torus].mergeVertices();
    },
    loadPredefinedMaterials(commonPhongParams,commonLambert){
        this.predefineMaterials['phongFlat'] = new THREE.MeshPhongMaterial(commonPhongParams);
        this.predefineMaterials['phongFlat'].shading = THREE.FlatShading;
        this.predefineMaterials['phongSmooth'] = new THREE.MeshPhongMaterial(commonPhongParams);
        this.predefineMaterials['phongSmooth'].shading = THREE.SmoothShading;
        this.predefineMaterials['lambert'] = new THREE.MeshLambertMaterial(commonLambert);
        this.predefineMaterials['normal'] = new THREE.MeshNormalMaterial();
    },
    changePredefinedMaterialsColor(color){
        this.predefineMaterials['phongFlat'].color = color;
        this.predefineMaterials['phongSmooth'].color = color;
        this.predefineMaterials['lambert'].color = color;
    }
}









