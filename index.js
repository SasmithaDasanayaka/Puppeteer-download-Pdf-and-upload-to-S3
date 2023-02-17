var AWS = require('aws-sdk');
const puppeteer = require('puppeteer');
const needle = require('needle');

const ACCESS_KEY_ID = "<Access Key Id Here>";
const SECRET_ACCESS_KEY = "<Secret Access Key Here>";
const REGION = "<Region Here>";
const BUCKET = "<Bucket Name Here>";
const KEY = "<Key Here>";
const awaitMilliSeconds = 5000;

AWS.config.update({
	accessKeyId: ACCESS_KEY_ID,
	secretAccessKey: SECRET_ACCESS_KEY,
	region: REGION
});


const downloadPDF = async (pdfURL) => {
	try {

		const buffer = await needle('get', pdfURL);

		console.log("started uploading to S3")

		var s3Client = new AWS.S3();
		s3Client.upload({
			Bucket: BUCKET,
			Key: KEY,
			Body: buffer.body,
			ContentEncoding: 'base64',
			ContentType: 'application/pdf'
		}, async (error, data) => {
			if (error) console.log('error has happened', error);
			else console.log('success', data);
		})
	} catch (e) {
		console.log(e)
	}
}


(async function pupperteer() {
	const htmlEmailBodyPath = 'https://my.billdu.com/share/invoice/86a198c5-5f8a-43c1-b027-dfa1421befdb?email=invoices%40leapin.com.au&pay=0';
	console.log('starting...');
	const browser = await puppeteer.launch({
		headless: false
	});
	console.log('browser launched...');

	try {
		const page = await browser.newPage();

		console.log('started navigating...');
		await page.goto(htmlEmailBodyPath, { waitUntil: 'networkidle2' });
		console.log('ended navigating...');

		await new Promise(r => setTimeout(r, awaitMilliSeconds));

		var pages = await browser.pages();
		var lastPage = pages[pages.length - 1];

		lastPage.on('response', async (response) => {
			const contectType = response.headers()['content-type']?.split(';')[0];
			if (contectType === 'application/pdf') {
				console.log('PDF link (auto download)', response.url());
				await downloadPDF(response.url());
			}
		})

		const downloadInvoiceBtnTitle = 'Download PDF';

		let isDownloadEmailInvoiceBtnTitleExists = await lastPage.$(`text/${downloadInvoiceBtnTitle}`) || null
		if (isDownloadEmailInvoiceBtnTitleExists) {
			let downloadInvoiceBtn = await lastPage.waitForSelector(`text/${downloadInvoiceBtnTitle}`);
			downloadInvoiceBtn && await downloadInvoiceBtn.click();

		}
		await new Promise(r => setTimeout(r, awaitMilliSeconds));

		await browser.close();

	} catch (e) {
		console.log(e)
		await browser.close();
	}
})()
