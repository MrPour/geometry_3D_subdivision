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
],
    //定义材质选择下拉框
    materialNamesSelected : [
    'phongFlat',
    'phongSmooth',
    'lambert',
    'normal',
     ],
}









