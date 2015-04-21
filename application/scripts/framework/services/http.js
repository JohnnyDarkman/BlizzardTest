// General AJAX wrapper that provides global and session request configurations
Application.extend(['application', function(app) { // Wrapping like this will make global configuration become per-application
	var globalHeaders = {};
	var globalConfig = {};
	var globalParams = {};
	
	// Not singleton. Allows a service to configure its own common headers/parameters without affecting other services
	app.register.perResolve('http', ['html', function(html) {
		var persistHeaders = {};
		var persistConfig = {};
		var persistParams = {};
		
		this.setGlobalHeader = function(key, value) { globalHeaders[key] = value; }
		this.setGlobalConfig = function(key, value) { globalConfig[key] = value; }
		this.setGlobalParam = function(key, value) { globalParams[key] = value; }
		
		this.setHeader = function(key, value) { persistHeaders[key] = value; }
		this.setConfig = function(key, value) { persistConfig[key] = value; }
		this.setParam = function(key, value) { persistParams[key] = value; }
		
		function combine(source, persist, global) {
			var result = {};
			for (var key in source) { result[key] = source[key]; }
			for (var key in persist) { if (!(key in result)) { result[key] = persist[key]; } }
			for (var key in global) { if (!(key in result)) { result[key] = global[key]; } }
			return result;
		}
		
		function applyHeaders(headers) {
			return combine(headers, persistHeaders, globalHeaders);
		}
		
		function applyConfig(config) {
			return combine(config, persistConfig, globalConfig);
		}
		
		function applyParams(params) {
			return combine(params, persistParams, globalParams);
		}
	
		// REST methods
		this.get = function(uri, params, success, error, headers, config) {
			return send('get', html.formatUri(uri, applyParams(params)), success, error, false, applyHeaders(headers), applyConfig(config));
		};
		
		this.delete = function(uri, params, success, error, headers, config) {
			return send('delete', html.formatUri(uri, applyParams(params)), success, error, false, applyHeaders(headers), applyConfig(config));
		};
		
		this.post = function(uri, body, success, error, headers, config) {
			return send('post', uri, success, error, applyParams(body), applyHeaders(headers), applyConfig(config));
		};
		
		this.patch = function(uri, body, success, error, headers, config) {
			return send('patch', uri, success, error, applyParams(body), applyHeaders(headers), applyConfig(config));
		};
		
		this.put = function(uri, body, success, error, headers, config) {
			return send('put', uri, success, error, applyParams(body), applyHeaders(headers), applyConfig(config));
		};
		
		Object.freeze(this);
	}]);
	
	function send(method, uri, success, error, body, headers, config) {
		body = body ? JSON.stringify(body) : false;
		error = error || function() {};
		success = success || function() {};
		config = config || {};
		headers = headers || {};
		headers['Accept'] = 'application/json';
		if (body !== false) {
			headers['Content-Type'] = 'application/json';
		}
		
		var request = new XMLHttpRequest();
		request.open(method, uri, config.async !== false, config.user, config.pass);
		
		for (var header in headers) {
			request.setRequestHeader(header, headers[header]);
		}
		if (config.mimeType) { request.overrideMimeType(config.mimeType); }
		if (config.withCredentials === true) { request.withCredentials = true; }
		if (config.timeout) { request.timeout = timeout; }
		
		request.onreadystatechange = function() {
			if (this.readyState !== 4) { return; }
			var response = pack(this);
			var data = tryparse(this.responseText);
			if (this.status < 200 || this.status >= 400) { error.call(response, data); }
			else { success.call(response, data); }
		}
		
		request.ontimeout = function() {
			error({}, pack(request, true));
		}
		
		if (body === false) { request.send(); }
		else { request.send(body); }
		
		return request.abort;
	}

	function pack(request, timeout) {
		return {
			timeout: !!timeout,
			state: request.readyState,
			response: request.response,
			responseText: request.responseText,
			responseType: request.responseType,
			status: request.status,
			statusText: request.statusText,
			getHeaders: request.getAllResponseHeaders,
		}
	}

	function tryparse(content) {
		try { return JSON.parse(content); } catch(error) { console.log(content); return { parseError: error } }
	}
}]);
