setInterval(console.clear,1e3*60);
reloadMe = () => {};
{
	let isFramed;
	try {isFramed=window!=window.top||document!=top.document||self.location!=top.location} catch (e) {isFramed=true};
	isFramed && window.open(location.href);
};
