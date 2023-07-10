export class SceneMesh {
    constructor(panelShowParams) {
            this.currentGeometryName = panelShowParams.geometry;
            this.subdivAmount = -1;
            this.originalGeometry = null;
            this.currentGeometry= null;
            this.mesh = null;
            this.wireMesh = null;
            this.origMesh = null;
            this.wireMat = null;
            this.origMat = null;
            this.meshColor = new THREE.Color(parseInt(panelShowParams.meshColor.replace('#', '0x')));
            this.wireColor = new THREE.Color(parseInt(panelShowParams.wireColor.replace('#', '0x')));
            this.originalColor = new THREE.Color(parseInt(panelShowParams.originalColor.replace('#', '0x')));
            this.backgroundColor = new THREE.Color(parseInt(panelShowParams.backgroundColor.replace('#', '0x')));
            this.material = panelShowParams.material
    }

    updateCurrentMesh(geometry){
            this.currentGeometry = geometry;
            this.mesh.geometry = geometry;
            this.wireMesh.geometry = geometry;
    }

    updateOriginalMesh(geometry){
            this.originalGeometry = geometry;
            this.origMesh.geometry = geometry;
    }
}