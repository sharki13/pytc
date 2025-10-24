// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface PytestConfig {
	tb?: string;
	numprocesses?: string;
	verbosity?: string;
	captureOutput?: boolean;
	headed?: boolean;
	delve?: boolean;
	browser?: string;
	slowmo?: boolean;
	tracing?: string;
	video?: string;
	showlocals?: boolean;
}

/**
 * Webview provider for the Pytest Configuration panel
 */
class PytestConfigViewProvider implements vscode.WebviewViewProvider {
	
	public static readonly viewType = 'pytest-config-view';

	private _view?: vscode.WebviewView;
	private _workspaceFolder?: vscode.WorkspaceFolder;

	constructor(private readonly _extensionUri: vscode.Uri) {
		// Get the first workspace folder
		if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
			this._workspaceFolder = vscode.workspace.workspaceFolders[0];
		}
	}

	private getProcessOptions(): string[] {
		const cpuCount = os.cpus().length;
		const options = ['none', 'auto', '1'];
		
		if (cpuCount > 2) {
			// Generate options in steps of 2, up to the CPU count
			for (let i = 2; i <= cpuCount; i += 2) {
				options.push(i.toString());
			}
			
			// If CPU count is odd and greater than the last added even number, add it
			if (cpuCount % 2 !== 0 && cpuCount > 2) {
				const lastOption = parseInt(options[options.length - 1]);
				if (lastOption < cpuCount) {
					options.push(cpuCount.toString());
				}
			}
		}
		
		return options;
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,
			localResourceRoots: [
				this._extensionUri
			]
		};

		// Handle messages from the webview
		webviewView.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'updateConfig':
						this.updateWorkspaceConfig(message.config);
						return;
				}
			},
			undefined,
			[]
		);

		// Listen for visibility changes and regenerate HTML with current config
		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible) {
				// Regenerate the HTML with current configuration when panel becomes visible
				webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
			}
		});

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
	}

	private getCurrentConfig(): PytestConfig {
		if (!this._workspaceFolder) {
			return {};
		}

		const workspaceConfig = vscode.workspace.getConfiguration('python.testing', this._workspaceFolder.uri);
		const pytestArgs: string[] = workspaceConfig.get('pytestArgs') || [];

		const config: PytestConfig = {};

		// Parse existing pytest arguments
		for (let i = 0; i < pytestArgs.length; i++) {
			const arg = pytestArgs[i];
			
			if (arg.startsWith('--tb=')) {
				config.tb = arg.split('=')[1];
			} else if (arg.startsWith('--numprocesses=')) {
				config.numprocesses = arg.split('=')[1];
			} else if (arg === '-q') {
				config.verbosity = 'quiet';
			} else if (arg === '-v') {
				config.verbosity = 'verbose';
			} else if (arg === '-vv') {
				config.verbosity = 'more-verbose';
			} else if (arg === '-vvv') {
				config.verbosity = 'very-verbose';
			} else if (arg === '-s') {
				config.captureOutput = true;
			} else if (arg === '--showlocals') {
				config.showlocals = true;
			} else if (arg === '--headed') {
				config.headed = true;
			} else if (arg === '--delve=1') {
				config.delve = true;
			} else if (arg.startsWith('--browser=')) {
				config.browser = arg.split('=')[1];
			} else if (arg === '--slowmo') {
				config.slowmo = true;
			} else if (arg.startsWith('--tracing=')) {
				config.tracing = arg.split('=')[1];
			} else if (arg.startsWith('--video=')) {
				config.video = arg.split('=')[1];
			}
		}

		return config;
	}

	private async updateWorkspaceConfig(config: PytestConfig) {
		if (!this._workspaceFolder) {
			vscode.window.showErrorMessage('No workspace folder found');
			return;
		}

		try {
			// Build new pytest arguments array
			const newArgs: string[] = [];

			// Add --tb parameter
			if (config.tb && config.tb !== 'none') {
				newArgs.push(`--tb=${config.tb}`);
			}

			// Add --numprocesses parameter
			if (config.numprocesses && config.numprocesses !== 'none') {
				newArgs.push(`--numprocesses=${config.numprocesses}`);
			}

			// Add verbosity parameter
			if (config.verbosity) {
				switch (config.verbosity) {
					case 'quiet':
						newArgs.push('-q');
						break;
					case 'verbose':
						newArgs.push('-v');
						break;
					case 'more-verbose':
						newArgs.push('-vv');
						break;
					case 'very-verbose':
						newArgs.push('-vvv');
						break;
				}
			}

			// Add capture output parameter
			if (config.captureOutput) {
				newArgs.push('-s');
			}

			// Add showlocals parameter
			if (config.showlocals) {
				newArgs.push('--showlocals');
			}

			// Add headed parameter
			if (config.headed) {
				newArgs.push('--headed');
			}

			// Add delve parameter
			if (config.delve) {
				newArgs.push('--delve=1');
			}

			// Add browser parameter
			if (config.browser && config.browser !== 'none') {
				newArgs.push(`--browser=${config.browser}`);
			}

			// Add slowmo parameter
			if (config.slowmo) {
				newArgs.push('--slowmo');
			}

			// Add tracing parameter
			if (config.tracing && config.tracing !== 'none') {
				newArgs.push(`--tracing=${config.tracing}`);
			}

			// Add video parameter
			if (config.video && config.video !== 'none') {
				newArgs.push(`--video=${config.video}`);
			}

			// Update workspace configuration
			const workspaceConfig = vscode.workspace.getConfiguration('python.testing', this._workspaceFolder.uri);
			await workspaceConfig.update('pytestArgs', newArgs, vscode.ConfigurationTarget.Workspace);

			vscode.window.showInformationMessage('Pytest configuration updated successfully');
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to update pytest configuration: ${error}`);
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		const currentConfig = this.getCurrentConfig();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Pytest Configuration</title>
				<style>
					body {
						font-family: var(--vscode-font-family);
						font-size: var(--vscode-font-size);
						font-weight: var(--vscode-font-weight);
						color: var(--vscode-foreground);
						background-color: var(--vscode-sideBar-background);
						padding: 20px 16px;
						margin: 0;
						line-height: 1.4;
					}
					
					h3 {
						font-size: 12px;
						font-weight: 700;
						text-transform: uppercase;
						letter-spacing: 0.5px;
						color: var(--vscode-sideBarSectionHeader-foreground);
						margin: 22px 0 8px 0;
						padding: 0;
						border: none;
					}
					
					h3:first-child {
						margin-top: 0;
					}
					
					.section-separator {
						height: 1px;
						background-color: var(--vscode-widget-border);
						margin: 16px 0;
						opacity: 0.6;
					}
					
					.setting-item {
						display: flex;
						align-items: center;
						justify-content: space-between;
						min-height: 28px;
						margin: 4px 0;
						padding: 0;
					}
					
					.setting-label {
						flex: 1;
						font-size: 13px;
						color: var(--vscode-foreground);
						margin: 0;
						padding-right: 8px;
						font-weight: normal;
					}
					
					.setting-control {
						flex-shrink: 0;
						min-width: 120px;
					}
					
					select {
						background-color: var(--vscode-dropdown-background);
						color: var(--vscode-dropdown-foreground);
						border: 1px solid var(--vscode-dropdown-border);
						border-radius: 2px;
						padding: 4px 8px;
						font-size: 13px;
						width: 100%;
						height: 26px;
						outline: none;
					}
					
					select:focus {
						border-color: var(--vscode-focusBorder);
						box-shadow: 0 0 0 1px var(--vscode-focusBorder);
					}
					
					.checkbox-container {
						display: flex;
						align-items: center;
						justify-content: flex-end;
					}
					
					input[type="checkbox"] {
						width: 16px;
						height: 16px;
						margin: 0;
						cursor: pointer;
						accent-color: var(--vscode-checkbox-selectBackground);
					}
					
					input[type="checkbox"]:focus {
						outline: 1px solid var(--vscode-focusBorder);
						outline-offset: 2px;
					}
					
					.setting-description {
						font-size: 12px;
						color: var(--vscode-descriptionForeground);
						margin-left: 0;
						opacity: 0.8;
					}
				</style>
			</head>
			<body>
				<h3>Pytest</h3>
				
				<div class="setting-item">
					<label class="setting-label" for="tb">Traceback output</label>
					<div class="setting-control">
						<select id="tb" onchange="updateConfig()">
							<option value="none" ${currentConfig.tb === undefined ? 'selected' : ''}>none</option>
							<option value="auto" ${currentConfig.tb === 'auto' ? 'selected' : ''}>auto</option>
							<option value="long" ${currentConfig.tb === 'long' ? 'selected' : ''}>long</option>
							<option value="short" ${currentConfig.tb === 'short' ? 'selected' : ''}>short</option>
							<option value="native" ${currentConfig.tb === 'native' ? 'selected' : ''}>native</option>
							<option value="no" ${currentConfig.tb === 'no' ? 'selected' : ''}>no</option>
						</select>
					</div>
				</div>

				<div class="setting-item">
					<label class="setting-label" for="numprocesses">Number of processes</label>
					<div class="setting-control">
						<select id="numprocesses" onchange="updateConfig()">
							${this.getProcessOptions().map(option => {
								const isSelected = (option === 'none' && currentConfig.numprocesses === undefined) || 
												 (currentConfig.numprocesses === option);
								return `<option value="${option}" ${isSelected ? 'selected' : ''}>${option}</option>`;
							}).join('')}
						</select>
					</div>
				</div>

				<div class="setting-item">
					<label class="setting-label" for="verbosity">Verbosity level</label>
					<div class="setting-control">
						<select id="verbosity" onchange="updateConfig()">
							<option value="" ${!currentConfig.verbosity ? 'selected' : ''}>Default</option>
							<option value="quiet" ${currentConfig.verbosity === 'quiet' ? 'selected' : ''}>Quiet</option>
							<option value="verbose" ${currentConfig.verbosity === 'verbose' ? 'selected' : ''}>Verbose</option>
							<option value="more-verbose" ${currentConfig.verbosity === 'more-verbose' ? 'selected' : ''}>More verbose</option>
							<option value="very-verbose" ${currentConfig.verbosity === 'very-verbose' ? 'selected' : ''}>Very verbose</option>
						</select>
					</div>
				</div>

				<div class="setting-item">
					<label class="setting-label" for="captureOutput">Capture output</label>
					<div class="checkbox-container">
						<input type="checkbox" id="captureOutput" ${currentConfig.captureOutput ? 'checked' : ''} onchange="updateConfig()">
					</div>
				</div>

				<div class="setting-item">
					<label class="setting-label" for="showlocals">Show locals</label>
					<div class="checkbox-container">
						<input type="checkbox" id="showlocals" ${currentConfig.showlocals ? 'checked' : ''} onchange="updateConfig()">
					</div>
				</div>

				<div class="section-separator"></div>
				<h3>Playwright</h3>

				<div class="setting-item">
					<label class="setting-label" for="browser">Browser</label>
					<div class="setting-control">
						<select id="browser" onchange="updateConfig()">
							<option value="none" ${currentConfig.browser === undefined ? 'selected' : ''}>none</option>
							<option value="chromium" ${currentConfig.browser === 'chromium' ? 'selected' : ''}>chromium</option>
							<option value="firefox" ${currentConfig.browser === 'firefox' ? 'selected' : ''}>firefox</option>
							<option value="webkit" ${currentConfig.browser === 'webkit' ? 'selected' : ''}>webkit</option>
						</select>
					</div>
				</div>

				<div class="setting-item">
					<label class="setting-label" for="headed">Show browser</label>
					<div class="checkbox-container">
						<input type="checkbox" id="headed" ${currentConfig.headed ? 'checked' : ''} onchange="updateConfig()">
					</div>
				</div>

				<div class="setting-item">
					<label class="setting-label" for="slowmo">Slow motion</label>
					<div class="checkbox-container">
						<input type="checkbox" id="slowmo" ${currentConfig.slowmo ? 'checked' : ''} onchange="updateConfig()">
					</div>
				</div>

				<div class="setting-item">
					<label class="setting-label" for="tracing">Tracing</label>
					<div class="setting-control">
						<select id="tracing" onchange="updateConfig()">
							<option value="none" ${currentConfig.tracing === undefined ? 'selected' : ''}>none</option>
							<option value="on" ${currentConfig.tracing === 'on' ? 'selected' : ''}>on</option>
							<option value="off" ${currentConfig.tracing === 'off' ? 'selected' : ''}>off</option>
							<option value="retain-on-failure" ${currentConfig.tracing === 'retain-on-failure' ? 'selected' : ''}>retain-on-failure</option>
						</select>
					</div>
				</div>

				<div class="setting-item">
					<label class="setting-label" for="video">Video</label>
					<div class="setting-control">
						<select id="video" onchange="updateConfig()">
							<option value="none" ${currentConfig.video === undefined ? 'selected' : ''}>none</option>
							<option value="on" ${currentConfig.video === 'on' ? 'selected' : ''}>on</option>
							<option value="off" ${currentConfig.video === 'off' ? 'selected' : ''}>off</option>
							<option value="retain-on-failure" ${currentConfig.video === 'retain-on-failure' ? 'selected' : ''}>retain-on-failure</option>
						</select>
					</div>
				</div>

				<div class="section-separator"></div>
				<h3>Debugging</h3>

				<div class="setting-item">
					<label class="setting-label" for="delve">Wait for Delve attach</label>
					<div class="checkbox-container">
						<input type="checkbox" id="delve" ${currentConfig.delve ? 'checked' : ''} onchange="updateConfig()">
					</div>
				</div>

				<script>
					const vscode = acquireVsCodeApi();

					function updateConfig() {
						const config = {
							tb: document.getElementById('tb').value,
							numprocesses: document.getElementById('numprocesses').value,
							verbosity: document.getElementById('verbosity').value,
							captureOutput: document.getElementById('captureOutput').checked,
							showlocals: document.getElementById('showlocals').checked,
							headed: document.getElementById('headed').checked,
							delve: document.getElementById('delve').checked,
							browser: document.getElementById('browser').value,
							slowmo: document.getElementById('slowmo').checked,
							tracing: document.getElementById('tracing').value,
							video: document.getElementById('video').value
						};

						vscode.postMessage({
							command: 'updateConfig',
							config: config
						});
					}
				</script>
			</body>
			</html>`;
	}

	public refresh() {
		if (this._view) {
			this._view.webview.html = this._getHtmlForWebview(this._view.webview);
		}
	}
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Check if we're in a workspace (required for this extension)
	if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
		console.log('Pytest Config extension requires a workspace to be opened');
		return;
	}

	console.log('Pytest Config extension is now active!');

	// Register the Pytest Config webview provider
	const provider = new PytestConfigViewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(PytestConfigViewProvider.viewType, provider)
	);

	// Register command to refresh the config
	const refreshCommand = vscode.commands.registerCommand('pytest-config.refreshConfig', () => {
		provider.refresh();
		vscode.window.showInformationMessage('Pytest configuration refreshed');
	});

	context.subscriptions.push(refreshCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}
