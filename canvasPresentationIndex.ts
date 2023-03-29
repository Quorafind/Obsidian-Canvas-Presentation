import { ItemView, Notice, Plugin, requireApiVersion } from 'obsidian';

export default class CanvasPresentation extends Plugin {
	private currentView: ItemView;
	private currentSlide: string[] = [];
	private currentSlideNum: number = 0;
	private direction: string = "next";

	private selectedNodeSet = new Set();

	async onload() {
		this.addCommand({
		    id: 'next-group-in-viewport',
		    name: 'Next Group In ViewPort',
		    checkCallback: (checking: boolean) => {
		        // Conditions to check
				const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
		        if (canvasView?.getViewType() === 'canvas') {
		            // If checking is true, we're simply "checking" if the command can be run.
		            // If checking is false, then we want to actually perform the operation.
		            if (!checking) {
						// @ts-ignore
						const canvas = canvasView.canvas;
		                const groups = this.getAllGroupNodeInViewPort(canvasView);

						if(canvas.selection.size === 0) {
							canvas.deselectAll();
							canvas.select(groups[0]);
							canvas.zoomToSelection();
							return;
						}

						const selectedNode = canvas.selection.entries().next().value[1];
						const restGroups = groups.filter((group)=> {
							return group.x >= selectedNode.x && group.id !== selectedNode.id
						});

						if(restGroups.length === 0)  {
							canvas.deselectAll();
							canvas.select(groups[0]);
							canvas.zoomToSelection();
							return;
						}

						canvas.deselectAll();
						canvas.select(restGroups[0]);
						canvas.zoomToSelection();
						return;
		            }

		            // This command will only show up in Command Palette when the check function returns true
		            return true;
		        }
		    }
		});

		this.addCommand({
			id: 'previous-group-in-viewport',
			name: 'Previous Group In ViewPort',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
				if (canvasView?.getViewType() === 'canvas') {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						// @ts-ignore
						const canvas = canvasView.canvas;
						const groups = this.getAllGroupNodeInViewPort(canvasView);

						if(canvas.selection.size === 0) {
							canvas.deselectAll();
							canvas.select(groups[groups.length - 1]);
							canvas.zoomToSelection();
							return;
						}

						const selectedNode = canvas.selection.entries().next().value[1];
						const restGroups = groups.filter((group)=> {
							return group.x <= selectedNode.x && group.id !== selectedNode.id
						});

						if(restGroups.length === 0)  {
							canvas.deselectAll();
							canvas.select(groups[groups.length - 1]);
							canvas.zoomToSelection();
							return;
						}

						canvas.deselectAll();
						canvas.select(restGroups[restGroups.length - 1]);
						canvas.zoomToSelection();
						return;
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		this.addCommand({
			id: 'mark-slide-number',
			name: 'Mark Slide Number',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const canvasView = this.app.workspace.getActiveViewOfType(ItemView);

				const findNode = (map: any) => {
					for (const value of map) {
						if (value?.type === "text" && value?.text.startsWith("Slide:\n")) {
							return value;
						}
					}
					return false;
				};

				if (canvasView?.getViewType() === 'canvas') {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						// @ts-ignore
						const canvas = canvasView.canvas;
						if(!canvas) return;

						const nodes = canvas.getData().nodes;
						if(this.currentView !== canvasView) this.currentView = canvasView;
						if(Array.from(canvas.selection).length === 0) {
							new Notice("Please select at least one node");
							return;
						}

						let node = findNode(nodes);


						if (!node) {
							let selectionArray = Array.from(canvas.selection);
							if(!requireApiVersion("1.1.10")) node = canvas.createTextNode({x: -200, y: -200}, {height: 200, width: 200}, true);
							else {
								node = canvas.createTextNode({
									pos: {
										x: -200,
										y: -200,
										height: 200,
										width: 200
									},
									text: "",
									focus: false,
									save: true,
									size: {
										height: 200,
										width: 200,
										x: -200,
										y: -200
									}
								});
							}
							canvas.deselectAll();

							selectionArray.forEach((item: any) => {
								const node = canvas.nodes.get(item.id);
								if(node) canvas.select(node);
							});
						}

						// Check if node exist
						const slideNode = canvas.nodes.get(node.id);
						if(!(node?.text.contains("Slide:\n"))) {
							slideNode.setText("Slide:\n");
							canvas.requestSave();
						}

						const nodesArray = Array.from(canvas.selection);
						// console.log(nodesArray);
						if(nodesArray.length > 0) {
							let currentString = '- ';
							nodesArray.forEach((nodeItem: any) => {
								// console.log(node);
								currentString += nodeItem?.id + ', ';
							});
							currentString = currentString.slice(0, -2);
							slideNode.setText(slideNode?.text + currentString + '\n');
							canvas.requestSave();
						}
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'next-slide',
			name: 'Next Slide',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const canvasView = this.app.workspace.getActiveViewOfType(ItemView);

				const findSlideNode = (map: any) => {
					for (const value of map) {
						if (value?.type === "text" && value?.text.startsWith("Slide:\n")) {
							return value;
						}
					}
					return false;
				}

				if (canvasView?.getViewType() === 'canvas') {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						// @ts-ignore
						const canvas = canvasView.canvas;
						if(!canvas) return;

						const nodes = canvas.getData().nodes;


						const slideNode = canvas.nodes.get(findSlideNode(nodes).id);

						if(!slideNode) {
							new Notice("No slide node found, mark any node as slide before");
							return;
						}

						const slideText = slideNode?.text;
						this.currentSlide = slideText.split('\n').filter((i: any) =>i && i.trim());
						this.currentSlide.shift();

						canvas.deselectAll();

						if(this.currentSlideNum === this.currentSlide.length) this.currentSlideNum = 0;

						const slideNodes = this.currentSlide[this.direction === "next" ? this.currentSlideNum : this.currentSlideNum + 1 === this.currentSlide.length ? 0 : this.currentSlideNum + 1]?.slice(2).split(', ');

						setTimeout(()=>{
							slideNodes?.forEach((id) => {
								const node = canvas.nodes.get(id);
								if(node) canvas.select(node);
							});

							this.direction = "next";
							canvas.zoomToSelection();

							if(!(this.currentSlideNum === 0 && this.currentSlide.length === 1)) this.currentSlideNum = this.currentSlideNum + 1;
						}, 10);
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		this.addCommand({
			id: 'previous-slide',
			name: 'Previous Slide',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
				const findSlideNode = (map: any) => {
					for (const value of map) {
						if (value?.type === "text" && value?.text.startsWith("Slide:\n")) {
							return value;
						}
					}
					return false;
				}

				if (canvasView?.getViewType() === 'canvas') {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						// @ts-ignore
						const canvas = canvasView.canvas;
						if(!canvas) return;

						const nodes = canvas.getData().nodes;
						const slideNode = canvas.nodes.get(findSlideNode(nodes).id);

						if(!slideNode) {
							new Notice("No slide node found, mark any node as slide before");
							return;
						}

						const slideText = slideNode?.text;
						this.currentSlide = slideText.split('\n').filter((i: any) =>i && i.trim());
						this.currentSlide.shift();

						canvas.deselectAll();

						let currentSlideNum = this.currentSlideNum === 0 ? this.currentSlide.length - 1 : this.currentSlideNum - 1;
						if(this.currentSlideNum === this.currentSlide.length && this.direction !== "previous") currentSlideNum = this.currentSlide.length - 2;
						const slideNodes = this.currentSlide[currentSlideNum]?.slice(2).split(', ');

						setTimeout(()=>{
							slideNodes.forEach((id) => {
								const node = canvas.nodes.get(id);
								if(node) canvas.select(node);
							});

							this.direction = "previous";
							canvas.zoomToSelection();

							if(this.currentSlideNum === 0) this.currentSlideNum = this.currentSlide.length - 1;
							else this.currentSlideNum = this.currentSlideNum - 1;
						}, 10);
					}

					return true;
				}
			}
		});
	}

	getAllGroupNode(canvasView: any) {
		const canvas = canvasView.canvas;
		const groups = Array.from(canvas.nodes);
		const groupsArray: any[] = [];
		groups.forEach((group)=>{
			// @ts-ignore
			if(group[1]?.renderedZIndex === -1) groupsArray.push(group[1]);
		})
		groupsArray.sort((a, b) => a.x - b.x);

		return groupsArray;
	}

	getAllGroupNodeInViewPort(canvasView: any) {
		const canvas = canvasView.canvas;
		const groups = canvas.getViewportNodes();
		const groupsArray: any[] = [];

		// @ts-ignore
		groups.forEach((group)=>{
			if(group?.renderedZIndex === -1) groupsArray.push(group);
		})

		console.log(groupsArray);

		groupsArray.sort((a, b) => a.x - b.x);

		return groupsArray;
	}

	onunload() {
		// Remove all slide note?
	}
}
